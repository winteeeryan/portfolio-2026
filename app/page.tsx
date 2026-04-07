import IntroGate from "@/components/intro/intro-gate";

export default function Home() {
  return (
    <>
      <IntroGate />

      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#111",
          color: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1>Portfolio 2026</h1>
          <p>Intro animation is connected.</p>
        </div>
      </main>
    </>
  );
}
