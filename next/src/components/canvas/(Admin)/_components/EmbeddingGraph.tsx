// Graph-UI
// /Users/matthewsimon/Documents/Github/solomon-desktop/solomon-Desktop/next/src/components/canvas/(Admin)/_components/EmbeddingGraph.tsx

// /Users/matthewsimon/Documents/GitHub/solomon-desktop/solomon-Desktop/next/src/components/canvas/(Admin)/_components/EmbeddingGraph.tsx

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { cosineSimilarity } from "@/lib/similarity";
import { GraphData, GraphLink, GraphNode } from "@/types/graph";
import { Button } from "@/components/ui/button";
import { CircleMinus, CirclePlus, RefreshCcw } from "lucide-react";
import pLimit from "p-limit";
import { refineNodeLabel, refineEdgeRelationship } from "./nodeRefiner";

// 1) Import ForceGraph2D dynamically.
const ForceGraph2D = dynamic<any>(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface EmbeddingChunk {
  id: string;
  pageContent: string;
  embedding: number[];
  metadata?: {
    keywords?: string[];
    topics?: string[];
    module?: string | null;
  };
}

const EmbeddingGraph: React.FC = () => {
  const INITIAL_LIMIT = 100;
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [cursor, setCursor] = useState<string | null>(null);
  const [allEmbeddings, setAllEmbeddings] = useState<EmbeddingChunk[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [linkStrength, setLinkStrength] = useState(1);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const topK = 5;
  const graphRef = useRef<any>();

  // Convex mutations for batch updating graph data
  const batchUpsertGraphNodes = useMutation(api.graph.batchUpsertGraphNodes);
  const batchUpsertGraphLinks = useMutation(api.graph.batchUpsertGraphLinks);

  // 2) Fetch chunk embeddings
  const data = useQuery(api.chunks.getAllEmbeddings, { limit, cursor });
  const isLoading = data === undefined;

  // 3) On mount, load from sessionStorage if present
  useEffect(() => {
    const savedEmbeddings = sessionStorage.getItem("allEmbeddings");
    const savedGraphData = sessionStorage.getItem("graphData");
    const savedCamera = sessionStorage.getItem("camera");

    if (savedEmbeddings && savedGraphData) {
      setAllEmbeddings(JSON.parse(savedEmbeddings));
      setGraphData(JSON.parse(savedGraphData));
      if (savedCamera && graphRef.current) {
        const cameraState = JSON.parse(savedCamera);
        // Restore camera position from saved state.
        graphRef.current.camera(cameraState);
      }
    }
  }, []);

  // 4) Debug-log the newly fetched data
  useEffect(() => {
    console.log("Fetched Data:", data);
  }, [data]);

  // 5) If we have no embeddings from sessionStorage and we got new data
  useEffect(() => {
    if (allEmbeddings.length === 0 && data?.chunks && data.chunks.length > 0) {
      console.log("Fetched Chunks:", data.chunks);
      setAllEmbeddings((prev) => [...prev, ...data.chunks]);
      setCursor(data.nextCursor);
      setCursorHistory((prev) => [...prev, data.nextCursor]);
    }
  }, [data, allEmbeddings.length]);

  // 6) Build (or rebuild) the graph whenever `allEmbeddings` changes
  useEffect(() => {
    if (allEmbeddings.length === 0) return;

    async function buildGraph() {
      const limitLLM = pLimit(5); // concurrency limit for LLM calls

      // 6a) Build nodes using LLM for labels.
      const nodePromises = allEmbeddings.map((chunk) =>
        limitLLM(async () => {
          const kw = chunk.metadata?.keywords || [];
          const tp = chunk.metadata?.topics || [];
          const fallbackLabel = chunk.id.slice(0, 8);
          const { label, group } = await refineNodeLabel(kw, tp, fallbackLabel);
          return {
            id: chunk.id, // local identification for our graph (not necessarily the DB id)
            label,
            group,
          } as GraphNode;
        })
      );
      const nodes: GraphNode[] = await Promise.all(nodePromises);

      // 6b) Build edges based on cosine similarity.
      const linkPromises: Promise<GraphLink>[] = [];
      allEmbeddings.forEach((chunkA, indexA) => {
        const similarities = allEmbeddings.map((chunkB, indexB) => {
          if (indexA === indexB) return { id: chunkB.id, similarity: -1 };
          const sim = cosineSimilarity(chunkA.embedding, chunkB.embedding);
          return { id: chunkB.id, similarity: sim };
        });
        const topSimilar = similarities
          .filter((sim) => sim.similarity > 0)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK);
        topSimilar.forEach((sim) => {
          const chunkB = allEmbeddings.find((c) => c.id === sim.id);
          if (!chunkB) return;
          const linkP = limitLLM(async () => {
            const snippetA = chunkA.pageContent.slice(0, 300);
            const snippetB = chunkB.pageContent.slice(0, 300);
            const relationship = await refineEdgeRelationship(snippetA, snippetB);
            return {
              source: chunkA.id,
              target: chunkB.id,
              similarity: sim.similarity,
              relationship,
            } as GraphLink;
          });
          linkPromises.push(linkP);
        });
      });
      const links = await Promise.all(linkPromises);
      console.log("Generated Links with Relationships:", links);

      // Update local state with the new graph data.
      setGraphData({ nodes, links });

      // 6c) Batch update the database with the new graph nodes and links.
      try {
        const nodesForBatch = nodes.map((node) => ({
          documentChunkId: node.id, // Using node id as documentChunkId.
          label: node.label,
          group: node.group,
          significance: 0, // Or compute significance as needed.
        }));
        const linksForBatch = links.map((link) => ({
          source: link.source,
          target: link.target,
          similarity: link.similarity,
          relationship: link.relationship,
        }));
        await batchUpsertGraphNodes({ nodes: nodesForBatch });
        await batchUpsertGraphLinks({ links: linksForBatch });
      } catch (error) {
        console.error("Error with batched graph updates:", error);
      }
    }
    buildGraph();
  }, [allEmbeddings, batchUpsertGraphNodes, batchUpsertGraphLinks]);

  // 7) Persist data to sessionStorage
  useEffect(() => {
    if (allEmbeddings.length > 0) {
      sessionStorage.setItem("allEmbeddings", JSON.stringify(allEmbeddings));
      sessionStorage.setItem("graphData", JSON.stringify(graphData));
    }
  }, [allEmbeddings, graphData]);

  // 8) Save camera state on engine stop
  const handleEngineStop = () => {
    if (graphRef.current) {
      const camera = graphRef.current.camera();
      sessionStorage.setItem("camera", JSON.stringify(camera));
    }
  };

  // Save camera state before leaving the page.
  useEffect(() => {
    const handleBeforeUnload = () => {
      handleEngineStop();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 9) Pagination controls
  const loadMore = () => {
    const latestCursor = cursorHistory[cursorHistory.length - 1];
    if (latestCursor) {
      setLimit((prev) => prev + 100);
    }
  };

  const loadLess = () => {
    if (cursorHistory.length > 1) {
      setCursorHistory((prev) => prev.slice(0, prev.length - 1));
      setAllEmbeddings((prev) => prev.slice(0, prev.length - 100));
      setLimit((prev) => Math.max(prev - 100, INITIAL_LIMIT));
      setCursor(cursorHistory[cursorHistory.length - 2]);
    }
  };

  // 10) Refresh entire graph
  const handleRefresh = () => {
    sessionStorage.removeItem("allEmbeddings");
    sessionStorage.removeItem("graphData");
    sessionStorage.removeItem("camera");
    setAllEmbeddings([]);
    setGraphData({ nodes: [], links: [] });
    setCursor(null);
    setLimit(INITIAL_LIMIT);
    setCursorHistory([null]);
  };

  // 11) Loading/Empty states
  if ((isLoading || !data) && allEmbeddings.length === 0) {
    return <div>Loading...</div>;
  }
  if (!isLoading && data && data.chunks.length === 0 && allEmbeddings.length === 0) {
    return <div>No embeddings available.</div>;
  }

  // 12) Render ForceGraph2D
  return (
    <div className="w-full h-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="label"
        linkLabel="relationship" // Show relationship on hover
        nodeAutoColorBy="group"
        linkWidth={(link) => link.similarity * linkStrength}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={(link) => link.similarity * linkStrength}
        backgroundColor="#f9fafb"
        onEngineStop={handleEngineStop}
        width={1180}
        height={620}
        // For performance, only draw circles for nodes.
        nodeCanvasObject={(node, ctx, globalScale) => {
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
      />
      <div className="border-t flex space-x-2 mt-4">
        <Button
          variant="outline"
          onClick={loadLess}
          className="ml-2 mt-2 px-3 py-2 rounded"
          disabled={allEmbeddings.length <= INITIAL_LIMIT}
        >
          <CircleMinus />
        </Button>
        <Button
          variant="outline"
          onClick={loadMore}
          className="mt-2 px-3 py-2 rounded"
          disabled={!cursor}
        >
          <CirclePlus />
        </Button>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="mt-2 px-3 py-2 rounded"
          title="Refresh Graph"
        >
          <RefreshCcw />
        </Button>
      </div>
    </div>
  );
};

export default EmbeddingGraph;