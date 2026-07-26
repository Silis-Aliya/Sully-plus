import React, { createContext, useContext, useEffect, useState } from 'react';
import type { VirtualTime } from '../types';

const readClock = (): VirtualTime => {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    day: days[now.getDay()],
  };
};

const ClockContext = createContext<VirtualTime | undefined>(undefined);

export const ClockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [virtualTime, setVirtualTime] = useState<VirtualTime>(readClock);

  useEffect(() => {
    let minuteTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextMinute = () => {
      if (minuteTimer) clearTimeout(minuteTimer);
      const now = new Date();
      const delay = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
      minuteTimer = setTimeout(() => {
        setVirtualTime(readClock());
        scheduleNextMinute();
      }, Math.max(250, delay));
    };

    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setVirtualTime(readClock());
      scheduleNextMinute();
    };

    scheduleNextMinute();
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenVisible);
    return () => {
      if (minuteTimer) clearTimeout(minuteTimer);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenVisible);
    };
  }, []);

  return <ClockContext.Provider value={virtualTime}>{children}</ClockContext.Provider>;
};

export const useClock = (): VirtualTime => {
  const context = useContext(ClockContext);
  if (!context) throw new Error('useClock must be used within ClockProvider');
  return context;
};
