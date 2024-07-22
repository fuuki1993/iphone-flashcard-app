/**
 * =============================================
 * カスタムチャート軸コンポーネント
 * =============================================
 */

import React from 'react';
import { XAxis, YAxis } from 'recharts';

// ----------------------------------------
// 定数
// ----------------------------------------
const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

// ----------------------------------------
// カスタムX軸
// ----------------------------------------
/**
 * @component CustomXAxis
 * @description 曜日を表示するカスタムX軸
 * @param {Object} props - XAxisのプロパティ
 */
export const CustomXAxis = (props) => (
  <XAxis
    {...props}
    tick={{fontSize: 12}}
    tickFormatter={(value) => daysOfWeek[value]}
    label={{ value: '曜日', position: 'insideBottom', offset: -10 }}
  />
);

// ----------------------------------------
// カスタムY軸
// ----------------------------------------
/**
 * @component CustomYAxis
 * @description 学習時間を表示するカスタムY軸
 * @param {Object} props - YAxisのプロパティ
 */
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