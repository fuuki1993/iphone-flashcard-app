import React from 'react';
import { XAxis, YAxis } from 'recharts';

const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

export const CustomXAxis = (props) => (
  <XAxis
    {...props}
    tick={{fontSize: 12}}
    tickFormatter={(value) => daysOfWeek[value]}
    label={{ value: '曜日', position: 'insideBottom', offset: -10 }}
  />
);

export const CustomYAxis = (props) => (
  <YAxis
    {...props}
    tick={{fontSize: 12}}
    tickCount={5}
    domain={[0, 'dataMax']}
    ticks={[0, 25, 50, 75, 100]}
    label={{ value: '学習時間 (分)', angle: -90, position: 'insideLeft', offset: -10 }}
  />
);