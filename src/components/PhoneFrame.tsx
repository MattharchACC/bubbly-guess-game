
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PhoneFrameProps {
  children: React.ReactNode;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const isMobile = useIsMobile();
  
  // On mobile devices, render without the frame for a full-screen experience
  if (isMobile) {
    return <div className="w-full h-full overflow-hidden">{children}</div>;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center py-6 px-2 transform-gpu">
      <div className="relative mx-auto border-black rounded-[3rem] h-[712px] w-[350px] shadow-xl overflow-hidden bg-black transform-gpu scale-100 sm:scale-100 md:scale-105 lg:scale-110 xl:scale-115">
        {/* iPhone notch */}
        <div className="absolute top-0 inset-x-0 h-6 bg-black z-30">
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-20 h-[0.85rem] bg-black rounded-b-xl"></div>
        </div>
        
        {/* Status bar */}
        <div className="absolute top-0 inset-x-0 h-7 bg-black flex items-center justify-between px-6 z-20">
          <div className="text-white text-xs font-medium">9:41</div>
          <div className="flex space-x-1">
            <svg
              className="h-3.5 w-3.5 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18.5 13h-1.5v-1.5c0-0.276-0.224-0.5-0.5-0.5s-0.5 0.224-0.5 0.5v1.5h-1.5c-0.276 0-0.5 0.224-0.5 0.5s0.224 0.5 0.5 0.5h1.5v1.5c0 0.276 0.224 0.5 0.5 0.5s0.5-0.224 0.5-0.5v-1.5h1.5c0.276 0 0.5-0.224 0.5-0.5s-0.224-0.5-0.5-0.5z"></path>
              <path d="M17.5 19h-11c-3.033 0-5.5-2.467-5.5-5.5v-3c0-3.033 2.467-5.5 5.5-5.5h11c3.033 0 5.5 2.467 5.5 5.5v3c0 3.033-2.467 5.5-5.5 5.5zM6.5 7c-1.93 0-3.5 1.57-3.5 3.5v3c0 1.93 1.57 3.5 3.5 3.5h11c1.93 0 3.5-1.57 3.5-3.5v-3c0-1.93-1.57-3.5-3.5-3.5h-11z"></path>
            </svg>
            <svg
              className="h-3.5 w-3.5 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12.998 23c-0.006 0-0.012 0-0.017 0-0.344-0.011-0.646-0.227-0.789-0.539l-1.57-3.321h-4.621c-0.553 0-1-0.447-1-1v-15.14c0-0.553 0.447-1 1-1h16c0.553 0 1 0.447 1 1v15.14c0 0.553-0.447 1-1 1h-4.621l-1.57 3.321c-0.155 0.326-0.484 0.538-0.846 0.539h-0.966z"></path>
            </svg>
            <svg
              className="h-3.5 w-3.5 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.5 18.5h-15c-0.276 0-0.5-0.224-0.5-0.5v-12c0-0.276 0.224-0.5 0.5-0.5h15c0.276 0 0.5 0.224 0.5 0.5v12c0 0.276-0.224 0.5-0.5 0.5z"></path>
            </svg>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-white z-10">
          <div className="absolute inset-0 pt-7 overflow-auto">
            {children}
          </div>
        </div>
        
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-28 h-1 bg-white rounded-full z-20"></div>
      </div>
    </div>
  );
};

export default PhoneFrame;
