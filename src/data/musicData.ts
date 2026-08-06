export interface MusicNode {
	id: string;
	title: string;
	type: string;
	date: string;
	description: string;
	chords?: string;
	tags: string[];
	// 背景色（亮色/暗色）
	color: {
		light: string;
		dark: string;
	};
}

export interface MusicLink {
	source: string;
	target: string;
	type: 'derivative' | 'inspiration' | 'resonance';
	description: string;
}

export const MUSIC_NODES: MusicNode[] = [
	{
		id: 'sunset-guitar',
		title: '日落与吉他',
		type: '木吉他即兴 (Guitar Jam)',
		date: '2025-05-10',
		description:
			'在海边夕阳下的一段木吉他扫弦与即兴单音旋律。采用了 #利底亚调式 (Lydian Mode)，听起来有一种微光闪烁的漂浮感，这也是我这趟音乐旅程的起点。',
		chords: 'Cmaj7 - D/C - Bm7 - Em7',
		tags: ['木吉他', '利底亚', '即兴'],
		color: {
			light: '#8ec07c', // aqua
			dark: '#689d6a',
		},
	},
	{
		id: 'echo-fold',
		title: '回声折叠',
		type: '氛围电子 (Ambient Synth)',
		date: '2025-07-22',
		description:
			'将《日落与吉他》的录音音轨降速 50% 并经过超长反馈的延迟与板式混响。所有的物理噪音和扫弦摩擦在空间里被折叠延伸，融化成水下般温润、潮湿的声景底色。',
		chords: 'Cmaj7 - G/B - Am7 - Em/G',
		tags: ['混响', '超长延迟', '氛围'],
		color: {
			light: '#458588', // blue
			dark: '#83a598',
		},
	},
	{
		id: 'counterpoint-groove',
		title: '对位律动',
		type: '新古典 (Neo-Classical Beat)',
		date: '2025-11-04',
		description:
			'尝试将巴赫式的三部对位法融入 120BPM 的 Lo-Fi 节奏中。大键琴（Harpsichord）清脆、坚硬的高声部交替向前迈进，与充满尘埃感的复古鼓点发生了一场跨时空的奇妙碰撞。',
		chords: 'Am - Dm - G - C - F - Bdim - E7 - Am',
		tags: ['大键琴', '对位法', 'Lo-Fi'],
		color: {
			light: '#b16286', // purple
			dark: '#d3869b',
		},
	},
	{
		id: 'glitch-glitch',
		title: '故障故障',
		type: '实验电子 (Experimental Glitch)',
		date: '2025-12-15',
		description:
			'提取了《对位律动》的大键琴音轨进行极端化的门限切割（Gating）和随机化重组。通过引入电路杂音与失真断层，探寻秩序崩塌后的碎片美学。',
		tags: ['微音切片', 'Glitch', '实验噪点'],
		color: {
			light: '#fe8019', // orange
			dark: '#d65d0e',
		},
	},
	{
		id: 'gravity-field',
		title: '重力场',
		type: '复古合成器 (Synthwave)',
		date: '2026-03-20',
		description:
			'一首宏大的科幻主题电子乐。底座使用模拟合成器肥厚饱满的锯齿波 Bass 铺底（继承自《回声折叠》音色），高声部则点缀着破碎的、亮闪闪的故障切片音效（受《故障故障》的启发）。',
		chords: 'Fm7 - Dbmaj7 - Bbm7 - C7',
		tags: ['模拟合成', '重低音', 'Synthwave'],
		color: {
			light: '#b57614', // yellow
			dark: '#fabd2f',
		},
	},
	{
		id: 'rhythm-toy',
		title: '节奏玩具',
		type: '微缩电子 (Micro-Beat)',
		date: '2026-06-01',
		description:
			'收集生活中被忽视的小动静（敲击玻璃杯、拉链滑过、折纸、水滴）并将其组合为精密排布的物理打击乐组。它是对前期复杂宏大曲风的一次极简退火，像一只可爱的发条玩具音乐盒。',
		chords: 'C - G - C - G7',
		tags: ['拟音录制', '极简主义', '发条质感'],
		color: {
			light: '#a89984', // gray
			dark: '#928374',
		},
	},
	{
		id: 'lofi-toybox',
		title: '玩具箱尾声',
		type: '微缩音轨 (Mini Outro)',
		date: '2026-07-16',
		description:
			'整个音乐探索旅程的终点。融合了《日落与吉他》的温暖余音、《回声折叠》的缓速合成脉冲与《节奏玩具》的日常打击乐，像是一台旧玩具在夜晚逐渐停止发条的过程。',
		chords: 'Cmaj7 - Fmaj7 - Cmaj7',
		tags: ['收尾', '玩具盒', '物理发条', '大合奏'],
		color: {
			light: '#fb4934', // red
			dark: '#cc241d',
		},
	},
];

export const MUSIC_LINKS: MusicLink[] = [
	{
		source: 'sunset-guitar',
		target: 'echo-fold',
		type: 'derivative',
		description: '吉他录音降速并被展开，形成庞大的水下混响氛围',
	},
	{
		source: 'sunset-guitar',
		target: 'counterpoint-groove',
		type: 'inspiration',
		description:
			'木吉他的随性扫弦线条，经过整理被改编为严肃严谨的多声部对位大键琴乐段',
	},
	{
		source: 'counterpoint-groove',
		target: 'glitch-glitch',
		type: 'derivative',
		description: '大键琴音频轨被直接斩碎，在数字噪音的干扰下重组为微型故障切片',
	},
	{
		source: 'echo-fold',
		target: 'gravity-field',
		type: 'inspiration',
		description: '温润潮湿的合成器铺底为重力场宏大的太空氛围奠定了声学地基',
	},
	{
		source: 'glitch-glitch',
		target: 'gravity-field',
		type: 'inspiration',
		description:
			'断裂、破碎的短促音效被整齐地镶嵌在 80 年代极速奔跑的 Bassline 缝隙中',
	},
	{
		source: 'gravity-field',
		target: 'rhythm-toy',
		type: 'resonance',
		description: '褪去复杂的音色和宏大的叙事，仅保留纯粹的发条物理节奏与声响',
	},
	{
		source: 'sunset-guitar',
		target: 'lofi-toybox',
		type: 'resonance',
		description: '木吉他最后的温暖和弦余音，被用作整张图谱的终曲收尾',
	},
	{
		source: 'rhythm-toy',
		target: 'lofi-toybox',
		type: 'derivative',
		description: '日常敲击的打击乐组在降速后作为落幕的发条背景声',
	},
];
