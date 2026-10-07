import { Router, Response } from 'express';
import { prisma } from '../../config/database';
import { authenticate, AuthRequest } from '../../middleware/auth';

export const surveysRouter = Router();

// Middleware: Restricción exclusiva para SuperAdmin
const requireSuperAdmin = (req: AuthRequest, res: Response, next: () => void): void => {
  if (req.userRole !== 'SUPERADMIN') {
    res.status(403).json({ error: 'Acceso restringido a Super Administrador' });
    return;
  }
  next();
};

// =========================================================================
// RUTAS PARA TALLERES (EXPERIENCIA DEL CLIENTE / MODAL DE ENCUESTA)
// =========================================================================

/**
 * GET /api/surveys/pending
 * Consulta si el taller en sesión debe responder una encuesta (automática por fin de prueba o enviada manualmente por SuperAdmin).
 */
surveysRouter.get('/pending', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId;
    if (!workshopId || req.userRole === 'SUPERADMIN') {
      res.json({ shouldShow: false, reason: 'SUPERADMIN_OR_NO_WORKSHOP' });
      return;
    }

    // 1. Verificar si hay una solicitud PENDIENTE explícita (despachada manualmente o creada previamente)
    let pendingRequest = await prisma.workshopSurveyRequest.findFirst({
      where: {
        workshopId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Si no hay solicitud pendiente, comprobar si el taller terminó su prueba gratis
    if (!pendingRequest) {
      const workshop = await prisma.workshop.findUnique({
        where: { id: workshopId },
        include: {
          subscription: true,
          surveyResponses: { take: 1 },
        },
      });

      if (workshop && workshop.subscription) {
        const sub = workshop.subscription;
        const now = new Date();
        const isTrial = sub.plan === 'TRIAL' || sub.status === 'TRIALING';

        let isExpired = false;
        if (isTrial && sub.trialEndsAt) {
          isExpired = sub.trialEndsAt.getTime() <= now.getTime();
        }

        // Si la prueba gratuita terminó y NUNCA ha respondido una encuesta, creamos la solicitud automática
        if (isTrial && isExpired && workshop.surveyResponses.length === 0) {
          pendingRequest = await prisma.workshopSurveyRequest.create({
            data: {
              workshopId,
              requestedBy: 'SYSTEM_AUTO_TRIAL',
              reason: 'Fin de prueba gratuita de 15 días',
              status: 'PENDING',
            },
          });
        }
      }
    }

    // Si aún no hay nada pendiente, no mostrar el modal
    if (!pendingRequest) {
      res.json({ shouldShow: false });
      return;
    }

    // 3. Traer las preguntas activas configuradas por el SuperAdmin
    const questions = await prisma.surveyQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    if (questions.length === 0) {
      res.json({ shouldShow: false, reason: 'NO_ACTIVE_QUESTIONS' });
      return;
    }

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { id: true, name: true, phone: true, email: true },
    });

    res.json({
      shouldShow: true,
      requestId: pendingRequest.id,
      reason: pendingRequest.reason || 'Fin de prueba gratuita',
      requestedBy: pendingRequest.requestedBy,
      questions,
      workshop,
    });
  } catch (error: any) {
    console.error('Error al consultar encuestas pendientes:', error);
    res.status(500).json({ error: 'Error al verificar encuestas pendientes' });
  }
});

/**
 * POST /api/surveys/respond
 * El taller envía sus respuestas a la encuesta.
 */
surveysRouter.post('/respond', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workshopId = req.workshopId;
    if (!workshopId) {
      res.status(400).json({ error: 'workshopId no encontrado' });
      return;
    }

    const { requestId, answers, rating, userPhone, userName, userEmail } = req.body;

    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ error: 'Las respuestas son requeridas' });
      return;
    }

    // Buscar si hay alguna pregunta de tipo RATING_STARS si el rating no vino explícito
    let calculatedRating = typeof rating === 'number' ? rating : null;
    if (calculatedRating === null) {
      for (const [key, val] of Object.entries(answers)) {
        if (typeof val === 'number' && val >= 1 && val <= 5) {
          calculatedRating = val;
          break;
        }
      }
    }

    const response = await prisma.surveyResponse.create({
      data: {
        workshopId,
        requestId: requestId || null,
        userId: req.userId || null,
        userName: userName || req.userName || 'Usuario Taller',
        userEmail: userEmail || req.userEmail || null,
        userPhone: userPhone || null,
        answers,
        rating: calculatedRating,
        status: 'PENDING',
      },
    });

    // Actualizar la solicitud como respondida
    if (requestId) {
      await prisma.workshopSurveyRequest.update({
        where: { id: requestId },
        data: {
          status: 'ANSWERED',
          answeredAt: new Date(),
        },
      });
    }

    res.status(201).json({
      success: true,
      message: '¡Muchas gracias por tus comentarios! Nos ayudas a seguir mejorando Rumilcar App.',
      data: response,
    });
  } catch (error: any) {
    console.error('Error al guardar respuesta de encuesta:', error);
    res.status(500).json({ error: 'Error al guardar respuesta de encuesta' });
  }
});

/**
 * POST /api/surveys/dismiss
 * El taller descarta temporalmente la encuesta ("Recordar más tarde").
 */
surveysRouter.post('/dismiss', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.body;
    if (requestId) {
      await prisma.workshopSurveyRequest.update({
        where: { id: requestId },
        data: {
          notifiedAt: new Date(),
        },
      });
    }
    res.json({ success: true, message: 'Encuesta pospuesta' });
  } catch (error: any) {
    console.error('Error al posponer encuesta:', error);
    res.status(500).json({ error: 'Error al posponer encuesta' });
  }
});

// =========================================================================
// RUTAS DE GESTIÓN PARA SUPERADMIN
// =========================================================================

/**
 * GET /api/surveys/admin/questions
 * Lista todas las preguntas configuradas (activas e inactivas).
 */
surveysRouter.get('/admin/questions', authenticate, requireSuperAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questions = await prisma.surveyQuestion.findMany({
      orderBy: { order: 'asc' },
    });
    res.json({ success: true, data: questions });
  } catch (error: any) {
    console.error('Error al listar preguntas:', error);
    res.status(500).json({ error: 'Error al listar preguntas' });
  }
});

/**
 * POST /api/surveys/admin/questions
 * Crea una nueva pregunta en el catálogo dinámico.
 */
surveysRouter.post('/admin/questions', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, type, options = [], isRequired = true, isActive = true, category = 'TRIAL_END', order } = req.body;

    if (!title || !type) {
      res.status(400).json({ error: 'El título y el tipo de pregunta son requeridos' });
      return;
    }

    let questionOrder = order;
    if (questionOrder === undefined) {
      const last = await prisma.surveyQuestion.findFirst({
        orderBy: { order: 'desc' },
      });
      questionOrder = (last?.order ?? 0) + 1;
    }

    const question = await prisma.surveyQuestion.create({
      data: {
        title,
        description: description || null,
        type,
        options: Array.isArray(options) ? options : [],
        isRequired: Boolean(isRequired),
        isActive: Boolean(isActive),
        category: category || 'TRIAL_END',
        order: questionOrder,
      },
    });

    res.status(201).json({ success: true, message: 'Pregunta creada exitosamente', data: question });
  } catch (error: any) {
    console.error('Error al crear pregunta:', error);
    res.status(500).json({ error: 'Error al crear pregunta' });
  }
});

/**
 * PUT /api/surveys/admin/questions/:id
 * Actualiza una pregunta existente.
 */
surveysRouter.put('/admin/questions/:id', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { title, description, type, options, isRequired, isActive, category, order } = req.body;

    const updated = await prisma.surveyQuestion.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(options !== undefined && { options: Array.isArray(options) ? options : [] }),
        ...(isRequired !== undefined && { isRequired: Boolean(isRequired) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(category !== undefined && { category }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });

    res.json({ success: true, message: 'Pregunta actualizada exitosamente', data: updated });
  } catch (error: any) {
    console.error('Error al actualizar pregunta:', error);
    res.status(500).json({ error: 'Error al actualizar pregunta' });
  }
});

/**
 * DELETE /api/surveys/admin/questions/:id
 * Elimina una pregunta.
 */
surveysRouter.delete('/admin/questions/:id', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    await prisma.surveyQuestion.delete({ where: { id } });
    res.json({ success: true, message: 'Pregunta eliminada correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar pregunta:', error);
    res.status(500).json({ error: 'Error al eliminar pregunta' });
  }
});

/**
 * POST /api/surveys/admin/dispatch
 * DISPARO MANUAL: Envía la encuesta directamente a un taller específico.
 */
surveysRouter.post('/admin/dispatch', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workshopId, reason } = req.body;

    if (!workshopId) {
      res.status(400).json({ error: 'workshopId es requerido' });
      return;
    }

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { users: { where: { role: 'OWNER' }, take: 1 } },
    });

    if (!workshop) {
      res.status(404).json({ error: 'Taller no encontrado' });
      return;
    }

    // Cancelar cualquier solicitud previa pendiente para evitar duplicados
    await prisma.workshopSurveyRequest.updateMany({
      where: { workshopId, status: 'PENDING' },
      data: { status: 'DISMISSED' },
    });

    const request = await prisma.workshopSurveyRequest.create({
      data: {
        workshopId,
        requestedBy: req.userId || 'SuperAdmin',
        reason: reason || 'Solicitud de feedback enviada por SuperAdmin',
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: `Encuesta enviada exitosamente al taller "${workshop.name}". Aparecerá en su próxima visita.`,
      data: request,
    });
  } catch (error: any) {
    console.error('Error al despachar encuesta manual:', error);
    res.status(500).json({ error: 'Error al despachar encuesta manual' });
  }
});

/**
 * GET /api/surveys/admin/responses
 * Lista todas las respuestas recibidas con detalles del taller y respuestas ordenadas.
 */
surveysRouter.get('/admin/responses', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, rating } = req.query;

    const whereClause: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status;
    }
    if (rating) {
      whereClause.rating = Number(rating);
    }

    const [responses, totalCount] = await Promise.all([
      prisma.surveyResponse.findMany({
        where: whereClause,
        include: {
          workshop: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              subscription: {
                select: {
                  plan: true,
                  status: true,
                },
              },
            },
          },
          surveyRequest: {
            select: {
              requestedBy: true,
              reason: true,
              notifiedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.surveyResponse.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      total: totalCount,
      data: responses,
    });
  } catch (error: any) {
    console.error('Error al listar respuestas de encuestas:', error);
    res.status(500).json({ error: 'Error al listar respuestas de encuestas' });
  }
});

/**
 * GET /api/surveys/admin/stats
 * Métricas globales del sistema de encuestas y feedback.
 */
surveysRouter.get('/admin/stats', authenticate, requireSuperAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalResponses, pendingRequests, allRatings, pendingContacts] = await Promise.all([
      prisma.surveyResponse.count(),
      prisma.workshopSurveyRequest.count({ where: { status: 'PENDING' } }),
      prisma.surveyResponse.findMany({
        where: { rating: { not: null } },
        select: { rating: true },
      }),
      prisma.surveyResponse.count({ where: { status: 'PENDING' } }),
    ]);

    const ratingSum = allRatings.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const avgRating = allRatings.length > 0 ? Number((ratingSum / allRatings.length).toFixed(1)) : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach((r) => {
      if (r.rating && r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
      }
    });

    res.json({
      success: true,
      stats: {
        totalResponses,
        pendingRequests,
        avgRating,
        totalRatings: allRatings.length,
        pendingContacts,
        ratingDistribution: distribution,
      },
    });
  } catch (error: any) {
    console.error('Error al calcular estadísticas de encuestas:', error);
    res.status(500).json({ error: 'Error al calcular estadísticas' });
  }
});

/**
 * PATCH /api/surveys/admin/responses/:id
 * Actualiza el estado de seguimiento y notas internas del SuperAdmin.
 */
surveysRouter.patch('/admin/responses/:id', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, adminNotes } = req.body;

    const updated = await prisma.surveyResponse.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
      },
    });

    res.json({
      success: true,
      message: 'Seguimiento actualizado correctamente',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error al actualizar respuesta de encuesta:', error);
    res.status(500).json({ error: 'Error al actualizar respuesta' });
  }
});
