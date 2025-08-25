import { useState, useEffect } from "react";
import { useOptions } from '../utils/optionsContext'

const calc = (hex, alpha = 0.5) => {
  const [r, g, b] = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function NewTab() {
  const { options } = useOptions();
  const mainText = options.siteTextColor ?? "#a0b0c8";

  const colorConfig = {
    text: mainText,
    textMuted: calc(mainText, 0.5),
  };

  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const newTime = new Date();
      setTime(newTime);
      
      const hour = newTime.getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else setGreeting("Good evening");
    };
    
    updateTime(); 
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(time);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ fontFamily: "SFProText, system-ui, sans-serif" }}
    >
      <div className="mb-2 text-5xl font-light" style={{ color: colorConfig.text }}>
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>
      
      <div className="mb-8 text-lg" style={{ color: colorConfig.textMuted }}>
        {greeting} • {formattedDate}
      </div>
    </div>
  );
}
