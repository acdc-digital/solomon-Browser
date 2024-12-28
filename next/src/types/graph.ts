// types/graph.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/types/graph.ts

export interface GraphNode {
    id: string;
    label: string;
    group: string | null;
  }
  
  export interface GraphLink {
    source: string;
    target: string;
    similarity: number;
  }
  
  export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
  }