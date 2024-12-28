// Page Visualization
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/canvas/(Projects)/_components/PageVisualization.tsx

import React from 'react';

interface PageVisualizationProps {
  pageSize: 'A4' | 'Letter';
  pageMargin?: string;
  zoom: number;
  children?: React.ReactNode;
}

const PageVisualization = ({
  pageSize,
  pageMargin = '20px auto',
  zoom,
  children,
}: PageVisualizationProps) => {
  const dimensions = pageSize === 'A4'
    ? { width: 595, height: 842 } // A4 in pixels at 72 DPI
    : { width: 612, height: 792 }; // Letter in pixels at 72 DPI

  return (
    <div
      className="page-visualization-container flex justify-left items-center ml-10"
      style={{
        padding: pageMargin,
        overflow: 'auto',
      }}
    >
      <div
        className="page-visualization bg-white border border-gray-300 shadow-md"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          backgroundColor: 'white',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          className="editor-content-wrapper p-4 overflow-auto h-full"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageVisualization;