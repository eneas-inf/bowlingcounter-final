export interface Roll {
  pins: number; // 0..10
  timestamp?: string;
}

export interface Frame {
  index: number; // 1..10
  rolls: Roll[];
}

