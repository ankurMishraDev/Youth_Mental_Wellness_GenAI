"use client";

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TreeVisualizationProps {
  streak: number; // 0-30+ days
  className?: string;
}

type GrowthStage = 'seedling' | 'sprout' | 'young' | 'growing' | 'blooming';

interface StageConfig {
  trunkHeight: number;
  trunkWidth: number;
  branches: number;
  leaves: number;
  color: string;
  leafColor: string;
  hasFlowers?: boolean;
}

interface Branch {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isLeft: boolean;
}

interface Leaf {
  id: string;
  x: number;
  y: number;
  delay: number;
}

export const TreeVisualization: React.FC<TreeVisualizationProps> = ({ 
  streak, 
  className = "" 
}) => {
  const [stage, setStage] = useState<GrowthStage>('seedling');

  useEffect(() => {
    if (streak >= 22) setStage('blooming');
    else if (streak >= 15) setStage('growing');
    else if (streak >= 8) setStage('young');
    else if (streak >= 4) setStage('sprout');
    else setStage('seedling');
  }, [streak]);

  const stages: Record<GrowthStage, StageConfig> = {
    seedling: {
      trunkHeight: 20,
      trunkWidth: 6,
      branches: 0,
      leaves: 0,
      color: '#8B4513',
      leafColor: '#90EE90',
    },
    sprout: {
      trunkHeight: 45,
      trunkWidth: 8,
      branches: 2,
      leaves: 4,
      color: '#6B8E23',
      leafColor: '#90EE90',
    },
    young: {
      trunkHeight: 65,
      trunkWidth: 10,
      branches: 4,
      leaves: 8,
      color: '#228B22',
      leafColor: '#00FF7F',
    },
    growing: {
      trunkHeight: 80,
      trunkWidth: 12,
      branches: 6,
      leaves: 12,
      color: '#32CD32',
      leafColor: '#00FF00',
    },
    blooming: {
      trunkHeight: 95,
      trunkWidth: 14,
      branches: 8,
      leaves: 16,
      color: '#228B22',
      leafColor: '#00FF00',
      hasFlowers: true,
    },
  };

  const currentStage = stages[stage];

  // Branch positions (relative to trunk top)
  const generateBranches = (): Branch[] => {
    const branches: Branch[] = [];
    const branchCount = currentStage.branches;
    const spacing = currentStage.trunkHeight / (branchCount + 1);

    for (let i = 0; i < branchCount; i++) {
      const yPos = spacing * (i + 1);
      const isLeft = i % 2 === 0;
      
      branches.push({
        id: i,
        startX: 50,
        startY: 120 - yPos,
        endX: isLeft ? 30 : 70,
        endY: 120 - yPos - 15,
        isLeft,
      });
    }
    return branches;
  };

  // Leaf positions on branches
  const generateLeaves = (): Leaf[] => {
    const branches = generateBranches();
    const leavesPerBranch = Math.ceil(currentStage.leaves / Math.max(currentStage.branches, 1));
    const leaves: Leaf[] = [];

    branches.forEach((branch, branchIdx) => {
      for (let i = 0; i < leavesPerBranch; i++) {
        const t = (i + 1) / (leavesPerBranch + 1);
        const x = branch.startX + (branch.endX - branch.startX) * t;
        const y = branch.startY + (branch.endY - branch.startY) * t;
        
        leaves.push({
          id: `${branchIdx}-${i}`,
          x,
          y,
          delay: (branchIdx * leavesPerBranch + i) * 0.1,
        });
      }
    });

    return leaves;
  };

  const branches = generateBranches();
  const leaves = generateLeaves();

  return (
    <svg
      viewBox="0 0 100 120"
      className={`w-full h-full ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground */}
      <motion.line
        x1="0"
        y1="120"
        x2="100"
        y2="120"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Trunk */}
      <motion.rect
        x={50 - currentStage.trunkWidth / 2}
        width={currentStage.trunkWidth}
        height={currentStage.trunkHeight}
        fill="white"
        rx={currentStage.trunkWidth / 2}
        initial={{ y: 120, height: 0 }}
        animate={{ 
          y: 120 - currentStage.trunkHeight,
          height: currentStage.trunkHeight 
        }}
        transition={{ 
          duration: 1, 
          ease: "easeOut",
          type: "spring",
          stiffness: 50,
        }}
      />

      {/* Branches */}
      {branches.map((branch) => (
        <motion.line
          key={branch.id}
          x1={branch.startX}
          y1={branch.startY}
          x2={branch.endX}
          y2={branch.endY}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.5 + branch.id * 0.15,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Leaves */}
      {leaves.map((leaf) => (
        <motion.circle
          key={leaf.id}
          cx={leaf.x}
          cy={leaf.y}
          r={3}
          fill={currentStage.leafColor}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 1 + leaf.delay,
            type: "spring",
            stiffness: 200,
          }}
          // Subtle floating animation
          style={{
            animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Flowers (only in blooming stage) */}
      {currentStage.hasFlowers && leaves.slice(0, 6).map((leaf, idx) => (
        <motion.circle
          key={`flower-${leaf.id}`}
          cx={leaf.x}
          cy={leaf.y}
          r={2}
          fill="#FFB6C1"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.6,
            delay: 2 + idx * 0.1,
            type: "spring",
            stiffness: 150,
          }}
        />
      ))}

      {/* CSS animation for floating effect */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </svg>
  );
};
