"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  convergenceSeries,
  dutyFromTemperatures,
  enthalpyProfile,
  temperatureProfile,
} from "@/lib/simulation/mockHeatExchanger";
import { useTwin } from "@/lib/store/TwinProvider";
import type { ChartTab } from "@/lib/types";

const EMBEDDED: { id: ChartTab; label: string }[] = [
  { id: "temperature", label: "Temperature Profile" },
  { id: "enthalpy", label: "Enthalpy Profile" },
  { id: "convergence", label: "Convergence" },
];

const FULL: { id: ChartTab; label: string }[] = [
  ...EMBEDDED,
  { id: "twin", label: "Twin Comparison" },
  { id: "sensitivity", label: "Sensitivity" },
];

export function ChartsPanel({ embedded = false }: { embedded?: boolean }) {
  const { chartTab, setChartTab } = useTwin();
  const tabs = embedded ? EMBEDDED : FULL;
  const active: ChartTab = embedded
    ? chartTab === "enthalpy" || chartTab === "convergence"
      ? chartTab
      : "temperature"
    : chartTab;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-7 shrink-0 items-center gap-3 border-b border-[#e5e5e5] px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setChartTab(tab.id)}
            className={`h-7 text-[12px] ${
              active === tab.id ? "border-b-2 border-[#1f4e79] font-semibold text-[#1f4e79]" : "text-[#444]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {active === "temperature" && <TemperatureChart />}
        {active === "enthalpy" && <EnthalpyChart />}
        {active === "convergence" && <ConvergenceChart />}
        {active === "twin" && <TwinChart />}
        {active === "sensitivity" && <SensitivityChart />}
      </div>
    </div>
  );
}

function ChartFrame({
  title,
  legend,
  children,
}: {
  title: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col px-2 pb-1 pt-1">
      <div className="grid shrink-0 grid-cols-[88px_minmax(0,1fr)_88px] items-center pb-0.5">
        <span />
        <div className="text-center text-[12px] font-semibold leading-tight text-[#243042]">{title}</div>
        <div className="justify-self-end text-[10px] leading-tight">{legend}</div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function StreamLegend() {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[#d42727]">— Hot</span>
      <span className="text-[#1f5fd0]">— Cold</span>
    </div>
  );
}

function axisDomain(values: number[], fallback: [number, number]): [number, number] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return fallback;
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  if (low >= fallback[0] && high <= fallback[1]) return fallback;
  return [Math.floor(low - 1), Math.ceil(high + 1)];
}

function TemperatureChart() {
  const { streams } = useTwin();
  const hotIn = streams[0];
  const hotOut = streams[1];
  const coldIn = streams[2];
  const coldOut = streams[3];
  const data =
    hotIn && hotOut && coldIn && coldOut
      ? temperatureProfile(hotIn.temperature, hotOut.temperature, coldIn.temperature, coldOut.temperature)
      : [];
  const domain = axisDomain(
    data.flatMap((point) => [point.hot, point.cold]),
    [25, 40],
  );

  return (
    <ChartFrame title="Temperature Profile Across Heat Exchanger" legend={<StreamLegend />}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 18 }}>
          <CartesianGrid stroke="#e6e6e6" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, 1]}
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            tick={{ fontSize: 11 }}
            label={{ value: "Heat Exchanger Length", position: "insideBottom", offset: -12, fontSize: 11 }}
          />
          <YAxis domain={domain} tick={{ fontSize: 11 }} width={32} />
          <Tooltip formatter={(value) => (typeof value === "number" ? value.toFixed(2) : value)} />
          <Line type="monotone" dataKey="hot" name="Hot Stream" stroke="#d42727" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="cold" name="Cold Stream" stroke="#1f5fd0" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function EnthalpyChart() {
  const { streams } = useTwin();
  const data = enthalpyProfile(streams);
  return (
    <ChartFrame title="Enthalpy Profile Across Heat Exchanger">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
          <CartesianGrid stroke="#e6e6e6" />
          <XAxis dataKey="x" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} label={{ value: "Heat Exchanger Length", position: "insideBottom", offset: -10, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={42} />
          <Tooltip />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="hot" name="Hot Stream" stroke="#d42727" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="cold" name="Cold Stream" stroke="#1f5fd0" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function ConvergenceChart() {
  const data = convergenceSeries();
  return (
    <ChartFrame title="Illustrative Solver Residual">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 16 }}>
          <CartesianGrid stroke="#e6e6e6" />
          <XAxis dataKey="iteration" tick={{ fontSize: 11 }} label={{ value: "Iteration", position: "insideBottom", offset: -10, fontSize: 11 }} />
          <YAxis scale="log" domain={[1e-6, 2]} tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Line type="monotone" dataKey="residual" name="Residual" stroke="#1f4e79" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="px-2 text-[11px] text-[#6b7280]">
        Illustrative residual. The mock model does not iterate a solver.
      </p>
    </ChartFrame>
  );
}

function TwinChart() {
  const { rows, results, predictions } = useTwin();
  const [variable, setVariable] = useState<"hot" | "cold" | "duty">("hot");
  const chartData = rows.map((row) => {
    const expected = results[row.id];
    const predicted = predictions[row.id];
    if (variable === "duty") {
      return {
        time: row.timestamp.slice(11, 16),
        actual: dutyFromTemperatures(row.hot_flow, row.hot_temperature, row.hot_outlet_actual),
        expected: expected?.heat_duty,
        predicted: predicted?.heat_duty,
      };
    }
    if (variable === "cold") {
      return {
        time: row.timestamp.slice(11, 16),
        actual: row.cold_outlet_actual,
        expected: expected?.cold_outlet_temperature,
        predicted: predicted?.cold_outlet_temperature,
      };
    }
    return {
      time: row.timestamp.slice(11, 16),
      actual: row.hot_outlet_actual,
      expected: expected?.hot_outlet_temperature,
      predicted: predicted?.hot_outlet_temperature,
    };
  });

  return (
    <ChartFrame title="Plant Actual vs Mock Expected vs ML Predicted">
      <div className="mb-1 flex justify-end gap-1 px-2">
        {(
          [
            ["hot", "Hot outlet"],
            ["cold", "Cold outlet"],
            ["duty", "Heat duty"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setVariable(id)}
            className={`border px-2 py-0.5 text-[11px] ${
              variable === id ? "border-[#1f4e79] bg-[#e7f1fb] text-[#1f4e79]" : "border-[#d0d0d0]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="h-[calc(100%-28px)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#e6e6e6" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="actual" name="Plant Actual" stroke="#111827" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="expected" name="Mock Expected" stroke="#1f4e79" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="predicted" name="ML Predicted" stroke="#d97706" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

function SensitivityChart() {
  const { rows, results } = useTwin();
  const data = rows
    .map((row) => ({
      hotIn: row.hot_temperature,
      mockHot: results[row.id]?.hot_outlet_temperature,
      plantHot: row.hot_outlet_actual,
      mockCold: results[row.id]?.cold_outlet_temperature,
    }))
    .sort((a, b) => a.hotIn - b.hotIn);

  return (
    <ChartFrame title="Sensitivity to Hot Inlet Temperature">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
          <CartesianGrid stroke="#e6e6e6" />
          <XAxis dataKey="hotIn" type="number" domain={["auto", "auto"]} tick={{ fontSize: 11 }} label={{ value: "Hot inlet (°C)", position: "insideBottom", offset: -10, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="mockHot" name="Mock hot outlet" stroke="#d42727" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="plantHot" name="Plant hot outlet" stroke="#111827" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="mockCold" name="Mock cold outlet" stroke="#1f5fd0" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
