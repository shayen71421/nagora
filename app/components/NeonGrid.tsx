export default function NeonGrid() {
    return (
        <div
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                width: "100%",
                height: "50vh",
                zIndex: 0,
                pointerEvents: "none",
                overflow: "hidden",
            }}
        >
            {/* Grid plane */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: "-50%",
                    width: "200%",
                    height: "100%",
                    backgroundImage: `
            linear-gradient(rgba(255,140,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,155,204,0.06) 1px, transparent 1px)
          `,
                    backgroundSize: "60px 60px",
                    transform: "perspective(600px) rotateX(72deg)",
                    transformOrigin: "bottom center",
                    animation: "grid-move 2.5s linear infinite",
                }}
            />

            {/* Horizon glow line */}
            <div
                style={{
                    position: "absolute",
                    top: "2px",
                    left: 0,
                    width: "100%",
                    height: "3px",
                    background:
                        "linear-gradient(90deg, transparent 0%, #ff8c00 30%, #ffb800 50%, #4a9bcc 70%, transparent 100%)",
                    boxShadow: "0 0 30px #ff8c00, 0 0 60px #ffb80066",
                    filter: "blur(0.5px)",
                }}
            />
        </div>
    );
}
