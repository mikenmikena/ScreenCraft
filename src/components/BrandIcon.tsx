import React from 'react';

interface BrandIconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<BrandIconProps['size']>, string> = {
  xs: 'w-5 h-5 rounded',
  sm: 'w-7 h-7 rounded-md',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-11 h-11 rounded-xl',
};

export const BrandIcon: React.FC<BrandIconProps> = ({
  className = '',
  size = 'sm',
}) => {
  return (
    <div
      className={`relative overflow-hidden shrink-0 bg-[#ed7122] shadow-md border border-[#ff8c1a]/40 ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src="/assets/aistudio/Gemini_Generated_Image_tfuhcptfuhcptfuh_cc524614.jpg"
        alt="ScreenCraft Icon"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover pointer-events-none select-none"
        style={{
          transform: 'scale(1.68) translateY(8.75%)',
          transformOrigin: '50% 50%',
        }}
      />
    </div>
  );
};
