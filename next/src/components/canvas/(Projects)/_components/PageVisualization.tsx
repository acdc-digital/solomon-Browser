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
  pageMargin = '15px',
  zoom,
  children,
}: PageVisualizationProps) => {
  // Base dimensions in px (at ~72 DPI):
  const dimensions =
    pageSize === 'A4'
      ? { width: 595, height: 842 }  // A4
      : { width: 612, height: 792 }; // Letter

  return (
    <div
      className="page-visualization-container flex justify-center items-start w-full h-full overflow-auto"
      style={{
        // Use `pageMargin` as padding, so there's space around the page.
        padding: pageMargin,
      }}
    >
      <div
        className="page-visualization bg-white border border-gray-300 shadow-md"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          // Scale around the horizontal center, pinned at the top:
          transformOrigin: 'top center',
          transform: `scale(${zoom})`,
          backgroundColor: 'white',
          position: 'relative',
          // We rely on the outer container for scrolling, so no overflow needed here
        }}
      >
        <div
          className="editor-content-wrapper w-full h-full"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageVisualization;