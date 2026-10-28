import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const data = [
  { name: '1 Mai', value: 120, prediction: null },
  { name: '5 Mai', value: 150, prediction: null },
  { name: '10 Mai', value: 180, prediction: null },
  { name: '15 Mai', value: 210, prediction: null },
  { name: '20 Mai', value: 240, prediction: null },
  { name: '25 Mai', value: 287, prediction: 287 },
  { name: '31 Mai', value: null, prediction: 315 },
];

export default function ConsumptionChart({ height = 250 }) {
  return (
    <div style={{ width: '100%', height: height, minHeight: height, marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3CCF4E" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3CCF4E" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF9F29" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#FF9F29" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="name" 
            stroke="#A0AEC0" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="#A0AEC0" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1A2230', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px'
            }} 
          />
          
          {/* Tier Limit Line */}
          <ReferenceLine y={300} stroke="#FF4D4D" strokeDasharray="3 3" label={{ position: 'top', value: 'Seuil Palier 3 (301 kWh)', fill: '#FF4D4D', fontSize: 10 }} />
          
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#3CCF4E" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorActual)" 
            connectNulls
          />
          <Area 
            type="monotone" 
            dataKey="prediction" 
            stroke="#FF9F29" 
            strokeWidth={3}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorPred)" 
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
