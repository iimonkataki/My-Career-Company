import TargetJDPicker from "@/components/TargetJDPicker";

export default function Page() {
  return (
    <main style={{ maxWidth: 840, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#073D32", margin: "0 0 8px" }}>MyCareerCompany — Target JD Picker (v3)</h1>
        <p style={{ color: "#555", margin: 0, fontSize: 15 }}>
          Company &times; Domain &times; Level &times; Role Calibrated Benchmark Engine
        </p>
      </header>
      <TargetJDPicker />
    </main>
  );
}
