import { PagosyaCreateCheckoutPayload, PagosyaQrResponse, CartItem } from "../models/types";
import { db, firebase } from "../models/firebaseModel";

export interface CreatePagosyaCheckoutResult {
  success: boolean;
  data?: PagosyaQrResponse;
  error?: string;
  statusCode?: number;
}

export class PagosyaController {
  private inFlightOrderId: string | null = null;
  private cachedCheckouts: Map<string, PagosyaQrResponse> = new Map();

  /**
   * Genera un identificador único de pedido con prefijo oficial Team Life
   */
  public generateOrderId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TL-ORD-${timestamp}-${random}`;
  }

  /**
   * Solicita al backend la creación del checkout y generación del código QR en PagosYa Sandbox
   */
  public async createCheckout(
    payload: PagosyaCreateCheckoutPayload,
    cartItems?: CartItem[]
  ): Promise<CreatePagosyaCheckoutResult> {
    const orderId = payload.order_id;

    // Evitar solicitudes concurrentes duplicadas con el mismo order_id
    if (this.inFlightOrderId === orderId) {
      return {
        success: false,
        statusCode: 409,
        error: "Ya se está procesando una solicitud para esta referencia de pedido. Por favor espera.",
      };
    }

    // Si ya existe un checkout generado para este orderId en memoria, devolverlo
    if (this.cachedCheckouts.has(orderId)) {
      return {
        success: true,
        statusCode: 200,
        data: this.cachedCheckouts.get(orderId),
      };
    }

    this.inFlightOrderId = orderId;

    try {
      // Intentar primero con la ruta de API principal
      let endpoint = "/api/pagosya/create-checkout";
      let response: Response;

      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        // Si responde 404 (por ejemplo si corre en un host estático con Netlify Functions), intentar fallback
        if (response.status === 404) {
          endpoint = "/.netlify/functions/pagosya-create-checkout";
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
        }
      } catch (networkErr: any) {
        console.warn("Fallo en primer endpoint, intentando fallback Netlify...", networkErr);
        endpoint = "/.netlify/functions/pagosya-create-checkout";
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const statusCode = response.status;
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = json?.error || "Error al generar código QR con PagosYa Sandbox.";

        if (statusCode === 409) {
          errorMsg = "Referencia de pedido duplicada (DUPLICATE_ORDER_ID). Reintenta generando una nueva referencia.";
        } else if (statusCode === 401) {
          errorMsg =
            json?.error ||
            "PAGOSYA_API_KEY no configurada o no autorizada. Asegúrate de configurar una clave que comience con 'sk_test_' en las variables de entorno.";
        }

        return {
          success: false,
          statusCode,
          error: errorMsg,
        };
      }

      // Validar datos recibidos
      const qrData: PagosyaQrResponse = json;

      // Almacenar en caché local para reintentos del mismo pedido sin duplicar
      this.cachedCheckouts.set(orderId, qrData);

      // Registrar intento de checkout en Firestore con estado "pendiente" (NUNCA pagado en Sandbox)
      try {
        await db.collection("checkouts_pagosya").doc(orderId).set({
          orderId,
          checkoutId: qrData.checkout_id || qrData.id || "",
          monto: payload.amount,
          moneda: payload.currency || "BOB",
          cliente: payload.customer || null,
          items: cartItems
            ? cartItems.map((i) => ({
                id: i.id,
                nombre: i.name,
                cantidad: i.quantity,
                precio: i.price,
                isCombo: i.isCombo,
              }))
            : [],
          estado: "pending", // NUNCA marcar como pagado en Sandbox
          livemode: false,
          ambiente: "sandbox",
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
          expiraEn: qrData.expires_at || null,
        });
      } catch (fireErr) {
        console.warn("Aviso Firestore al registrar checkout PagosYa:", fireErr);
      }

      return {
        success: true,
        statusCode,
        data: qrData,
      };
    } catch (err: any) {
      console.error("[PagosYa Controller Error]:", err);
      return {
        success: false,
        statusCode: 500,
        error: "No se pudo conectar con el servidor de PagosYa. Verifica tu conexión.",
      };
    } finally {
      this.inFlightOrderId = null;
    }
  }

  /**
   * Limpia el checkout en caché si el usuario decide cancelar o reiniciar el pedido
   */
  public clearCachedCheckout(orderId: string) {
    this.cachedCheckouts.delete(orderId);
  }
}

export const pagosyaController = new PagosyaController();
