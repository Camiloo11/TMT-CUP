import React, { useState } from "react";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function HistoryPanel({ isOpen, onClose, children }: HistoryPanelProps) {
  const [startY, setStartY] = useState<number | null>(null);
  const [currentTranslateY, setCurrentTranslateY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startY;

    // Solo permitimos arrastrar hacia abajo (valores positivos)
    if (diffY > 0) {
      setCurrentTranslateY(diffY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Si se arrastró más de 120px se cierra, si no, regresa a su posición original
    if (currentTranslateY > 120) {
      onClose();
    }
    setStartY(null);
    setCurrentTranslateY(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Fondo oscuro */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel Desplegable */}
      <div 
        className={`fixed bottom-0 left-0 right-0 md:top-0 md:left-auto md:w-[400px] h-[80vh] md:h-screen bg-white rounded-t-3xl md:rounded-t-none md:rounded-l-3xl shadow-2xl z-50 flex flex-col ${
          isDragging ? "" : "transition-transform duration-300"
        }`}
        style={{
          transform: `translateY(${currentTranslateY}px)`,
        }}
      >
        {/* Zona de arrastre superior */}
        <div 
          className="w-full pt-4 pb-2 flex flex-col items-center justify-center cursor-row-resize md:cursor-default select-none group shrink-0 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Barra visual de arrastre */}
          <div className="w-16 h-1.5 bg-gray-300 rounded-full transition-colors group-hover:bg-gray-400 md:hidden" />
          
          {/* Título centrado y más grande */}
          <h2 className="text-lg md:text-xl font-medium text-[#10204c] mt-3 md:mt-4 px-4 text-center w-full">
            Historial de auditoría
          </h2>
        </div>

        {/* Contenido del historial */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {children}
        </div>
      </div>
    </>
  );
}