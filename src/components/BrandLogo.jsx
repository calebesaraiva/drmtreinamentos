import React from 'react';
import { BRAND_LOGO_PATH, BRAND_NAME } from '../data/brand';

export default function BrandLogo({ className = '', imgClassName = '' }) {
  return (
    <div className={`overflow-hidden bg-transparent ${className}`}>
      <img
        src={BRAND_LOGO_PATH}
        alt={BRAND_NAME}
        className={`w-full h-full object-contain ${imgClassName}`}
      />
    </div>
  );
}
