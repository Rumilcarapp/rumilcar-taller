import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../../../components/ui';
import './CalendarPanel.css';

interface CalendarPanelProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  appointments: any[];
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ selectedDate, onSelectDate, appointments }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  
  // Basic calendar logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  const today = new Date();
  
  const getDays = () => {
    const days = [];
    // Previous month filler
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    // Next month filler
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let i = 0; i < remaining; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    return days;
  };

  const hasAppointments = (day: number) => {
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
    return appointments.some(a => a.date === dateStr);
  };

  return (
    <div className="calendar-panel">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={prevMonth} className="nav-btn"><ChevronLeft size={24} /></button>
          <h2 className="calendar-title">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
          <button onClick={nextMonth} className="nav-btn"><ChevronRight size={24} /></button>
        </div>
        <Badge variant="primary" className="ot-badge">OTs en curso: 4</Badge>
      </div>

      <div className="calendar-grid-header">
        <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
      </div>

      <div className="calendar-grid">
        {getDays().map((d, idx) => {
          if (!d.isCurrentMonth) {
            return <div key={`empty-${idx}`} className="calendar-cell empty"></div>;
          }
          
          const isToday = 
            today.getDate() === d.day && 
            today.getMonth() === currentMonth.getMonth() && 
            today.getFullYear() === currentMonth.getFullYear();
            
          const isSelected = 
            selectedDate.getDate() === d.day && 
            selectedDate.getMonth() === currentMonth.getMonth() && 
            selectedDate.getFullYear() === currentMonth.getFullYear();

          const hasApt = hasAppointments(d.day!);

          let cellClass = "calendar-cell";
          if (isToday) cellClass += " is-today";
          else if (isSelected) cellClass += " is-selected";

          return (
            <div 
              key={`day-${d.day}`} 
              className={cellClass}
              onClick={() => onSelectDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d.day!))}
            >
              <span className="day-number">{d.day}</span>
              {hasApt && <span className="apt-dot"></span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};