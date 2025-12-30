import React, { useMemo } from 'react';
// Next.js'te Plotly kullanmak için dinamik import şarttır:
import dynamic from 'next/dynamic';
import { Paper, Typography, useTheme, Box, CircularProgress } from '@mui/material';

// SSR'ı kapatarak Plot bileşenini yüklüyoruz.
// Yüklenirken 'loading...' göstermesi için bir loading komponenti ekledik.
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
            <CircularProgress />
        </Box>
    )
});

interface Props {
    item: any;
}

const CostAnalysisChart: React.FC<Props> = ({ item }) => {
    const theme = useTheme();

    const data = useMemo(() => {
        const referralCost = parseFloat(item.referralCost) || 0;
        const holdingCost = parseFloat(item.holdingCost) || 0;
        const depCoef = parseFloat(item.deprivationCoefficient) || 0;
        const depRate = parseFloat(item.deprivationRate) || 0;

        // Kritik parametreler yoksa null dön
        if (referralCost === 0 && depCoef === 0) return null;

        const days = Array.from({ length: 301 }, (_, i) => i / 10);

        const deprivationCurve = [];
        const referralLine = [];
        const holdingLine = [];

        let equalPoint = null;

        for (const t of days) {
            // Deprivation Cost = Coeff * (e^(rate * t) - 1)
            const dc = depCoef * (Math.exp(t * depRate) - 1);

            // Holding Cost = h * t
            const hc = holdingCost * t;

            // (Equality Point)
            if (equalPoint === null && dc >= referralCost) {
                equalPoint = t;
            }

            deprivationCurve.push(dc);
            referralLine.push(referralCost);
            holdingLine.push(hc);
        }

        return {
            x: days,
            deprivation: deprivationCurve,
            referral: referralLine,
            holding: holdingLine,
            equalPoint,
            referralCost
        };
    }, [item.referralCost, item.holdingCost, item.deprivationCoefficient, item.deprivationRate]);

    if (!data) return null;

    const yAxisMax = data.referralCost > 0 ? data.referralCost * 3 : undefined;

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: '#fafafa' }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Cost Equalization: {data.equalPoint ? `${data.equalPoint.toFixed(1)} Days` : 'Not reached within range'}
            </Typography>

            <Plot
                style={{ width: '100%', height: '350px' }}
                useResizeHandler
                data={[
                    {
                        x: data.x,
                        y: data.referral,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Referral Cost',
                        line: { color: theme.palette.error.main, width: 2, dash: 'dash' },
                    },
                    {
                        x: data.x,
                        y: data.deprivation,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Deprivation Cost',
                        line: { color: theme.palette.warning.main, width: 3 },
                        fill: 'tozeroy',
                        fillcolor: 'rgba(237, 108, 2, 0.1)'
                    },
                    {
                        x: data.x,
                        y: data.holding,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Holding Cost',
                        line: { color: theme.palette.info.main, width: 3 },
                        opacity: 0.8
                    },
                ]}
                layout={{
                    autosize: true,
                    margin: { l: 40, r: 20, t: 20, b: 40 },
                    showlegend: true,
                    legend: { orientation: 'h', y: -0.2 },
                    xaxis: { title: 'Time (Days)', zeroline: true },
                    yaxis: {
                        title: 'Cost ($)',
                        range: yAxisMax ? [0, yAxisMax] : undefined
                    },
                    shapes: data.equalPoint ? [{
                        type: 'line',
                        x0: data.equalPoint,
                        x1: data.equalPoint,
                        y0: 0,
                        y1: data.referralCost * 1.5,
                        line: { color: 'green', width: 1.5, dash: 'dot' }
                    }] : []
                }}
                config={{ displayModeBar: false }}
            />
        </Paper>
    );
};

export default CostAnalysisChart;