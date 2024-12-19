// Page Visualization
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/components/canvas/(Projects)/_components/PageVisualization.tsx

import React from 'react';

interface PageVisualizationProps {
  pageSize: 'A4' | 'Letter';
  pageMargin?: string;
  children?: React.ReactNode;
}

const PageVisualization = ({
  pageSize,
  pageMargin = '20px auto',
  children,
}: PageVisualizationProps) => {
  const dimensions = pageSize === 'A4'
    ? { width: '210mm', height: '297mm' }
    : { width: '8.5in', height: '11in' };

  return (
    <div
      className="page-visualization-container"
      style={{
        height: '50%', // Container takes full height of its parent
        overflowY: 'auto', // Enable vertical scrolling for the container
        padding: 0, // Apply margin as padding to the container
      }}
    >
      <div
        className="page-visualization"
        style={{
          width: '100%',
          maxWidth: dimensions.width,
          height: dimensions.height,
          border: '1px solid #d3d3d3',
          boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)',
          backgroundColor: 'white',
          margin: '0 auto', // Center the page within the container
          overflowY: 'auto',
        }}
      >
        <div
          className="editor-content-wrapper"
          style={{
            height: '50%', // Make editor content wrapper take the full height of the page
            overflowY: 'auto', // Enable vertical scrolling for content within the page
            padding: '10px',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageVisualization;