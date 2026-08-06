import type { MusicLink, MusicNode } from '../../data/musicData';

export type GraphNode = MusicNode & {
	x: number;
	y: number;
	vx: number;
	vy: number;
	fx: number;
	fy: number;
	radius: number;
};

export type GraphLink = Omit<MusicLink, 'source' | 'target'> & {
	source: GraphNode;
	target: GraphNode;
	plucked: boolean;
	pluckAmplitude: number;
	pluckPhase: number;
	pluckDecay: number;
};
