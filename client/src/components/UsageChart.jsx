import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Climatiseur', value: 42, color: '#4A90E2' },
  { name: 'Chauffe-eau', value: 25, color: '#FF9F29' },
  { name: 'Réfrigérateur', value: 15, color: '#3CCF4E' },
  { name: 'Autres', value: 18, color: '#A0AEC0' },
];

export default function UsageChart() {
  return (
    <div style={{ width: '100%', height: 200, minHeight: 200, position: 'relative' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={65}
            outerRadius={85}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1A2230', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>287 kWh</h3>
        <p style={{ fontSize: '0.75rem', color: '#A0AEC0' }}>Total</p>
      </div>
    </div>
  );
}
