import { ImageResponse } from "next/og";
import { BROKER_INFO, getPublicWhatsAppFormatted } from "@/lib/format";

export const alt = `${BROKER_INFO.brandName} — Imóveis em Cotia e Granja Vianna (CRECI ${BROKER_INFO.creci})`;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  const publicWhatsApp = getPublicWhatsAppFormatted();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #1b4332 0%, #163829 58%, #102a1f 100%)",
          padding: "56px 68px",
          color: "#faf9f6",
          position: "relative",
        }}
      >
        {/* Borda decorativa sutil */}
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            bottom: 24,
            left: 24,
            border: "1.5px solid rgba(200, 159, 101, 0.35)",
            borderRadius: 20,
            display: "flex",
          }}
        />

        {/* Topo: Monograma + Selo CRECI */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.08)",
                border: "2px solid #c89f65",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                color: "#faf9f6",
              }}
            >
              MS
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  fontFamily: "Georgia, serif",
                  color: "#faf9f6",
                }}
              >
                {BROKER_INFO.shortBrandName}
              </span>
              <span
                style={{
                  fontSize: 15,
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  color: "#c89f65",
                  marginTop: 2,
                }}
              >
                Negócios Imobiliários
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(200, 159, 101, 0.16)",
              border: "1px solid rgba(200, 159, 101, 0.45)",
              color: "#f5e6cc",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            CRECI-SP {BROKER_INFO.creci}
          </div>
        </div>

        {/* Centro: Título principal e proposta de valor */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 960,
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#c89f65",
              marginBottom: 16,
            }}
          >
            Cotia e Granja Vianna • SP
          </span>
          <span
            style={{
              fontSize: 58,
              fontWeight: 700,
              fontFamily: "Georgia, serif",
              lineHeight: 1.12,
              color: "#faf9f6",
            }}
          >
            Casas, apartamentos e terrenos em condomínios selecionados.
          </span>
          <span
            style={{
              marginTop: 22,
              fontSize: 24,
              lineHeight: 1.4,
              color: "rgba(250, 249, 246, 0.82)",
            }}
          >
            Atendimento direto, transparente e personalizado para compra, venda
            e locação.
          </span>
        </div>

        {/* Rodapé: Contato e Região */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.16)",
            paddingTop: 24,
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: 20,
              color: "rgba(250, 249, 246, 0.85)",
            }}
          >
            {BROKER_INFO.brandName}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 20,
              fontWeight: 600,
              color: "#c89f65",
            }}
          >
            <span>WhatsApp {publicWhatsApp}</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
