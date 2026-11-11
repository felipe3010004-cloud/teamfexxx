import dotenv from "dotenv";

dotenv.config({ override: true });

const PAGOSYA_SANDBOX_ENDPOINT =
  "https://nbjwpakpimrqfocsxkda.supabase.co/functions/v1/sandbox-create-checkout";

export interface PagosyaServiceResponse {
  success: boolean;
  statusCode: number;
  data?: any;
  error?: string;
  detail?: any;
}

export async function createPagosyaSandboxCheckout(
  payload: any,
  originHeader?: string
): Promise<PagosyaServiceResponse> {
  const apiKey = process.env.PAGOSYA_API_KEY?.trim();

  // 1. Validar presencia y formato de API Key (debe iniciar con sk_test_)
  if (!apiKey) {
    return {
      success: false,
      statusCode: 401,
      error:
        "No se encontró la variable PAGOSYA_API_KEY en el servidor. Por favor configura tu clave de pruebas 'sk_test_...' en el archivo .env o en el panel de Netlify.",
    };
  }

  if (!apiKey.startsWith("sk_test_")) {
    return {
      success: false,
      statusCode: 401,
      error:
        "La clave de PagosYa configurada no es válida para el ambiente Sandbox. En Sandbox la clave debe iniciar con el prefijo 'sk_test_'.",
    };
  }

  // 2. Validar monto (monto positivo)
  const amount = Number(payload.amount);
  if (isNaN(amount) || amount <= 0) {
    return {
      success: false,
      statusCode: 400,
      error: "El monto a cobrar debe ser un número positivo mayor a cero.",
    };
  }

  // 3. Validar identificador único de orden (order_id)
  const orderId =
    typeof payload.order_id === "string" ? payload.order_id.trim() : "";
  if (!orderId) {
    return {
      success: false,
      statusCode: 400,
      error: "El campo 'order_id' es obligatorio y debe ser un texto único.",
    };
  }
  if (orderId.length > 120) {
    return {
      success: false,
      statusCode: 400,
      error: "El campo 'order_id' no debe exceder los 120 caracteres.",
    };
  }

  // 4. Validar minutos de expiración (5 a 1440, por defecto 30)
  let expirationMinutes = Number(payload.expiration_minutes);
  if (isNaN(expirationMinutes) || expirationMinutes < 5 || expirationMinutes > 1440) {
    expirationMinutes = 30;
  }

  // 5. Determinar URLs de retorno
  const baseUrl = originHeader || "https://teamlife.bo";
  const successUrl =
    typeof payload.success_url === "string" && payload.success_url.trim()
      ? payload.success_url
      : `${baseUrl}/pago/exitoso`;
  const cancelUrl =
    typeof payload.cancel_url === "string" && payload.cancel_url.trim()
      ? payload.cancel_url
      : `${baseUrl}/pago/cancelado`;

  // 6. Preparar cuerpo exacto para el Sandbox de PagosYa
  const requestBody: Record<string, any> = {
    amount: Math.round(amount * 100) / 100,
    currency: payload.currency || "BOB",
    order_id: orderId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    expiration_minutes: expirationMinutes,
    customer: {
      name: payload.customer?.name?.slice(0, 100) || "Cliente Team Life",
      email: payload.customer?.email?.slice(0, 100) || undefined,
      phone: payload.customer?.phone?.slice(0, 30) || undefined,
    },
    metadata: {
      source: "team-life-web",
      app: "Equipo Vida S.R.L.",
      items_count: payload.metadata?.items_count || 1,
      ...(payload.metadata || {}),
    },
  };

  try {
    const response = await fetch(PAGOSYA_SANDBOX_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const statusCode = response.status;
    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      responseData = { message: "Respuesta no JSON recibida de PagosYa" };
    }

    if (!response.ok) {
      console.error(
        `[PagosYa Sandbox Error] HTTP ${statusCode}:`,
        responseData
      );

      // Tratamiento especial de errores comunes de la pasarela
      let friendlyError = "Error al comunicarse con la pasarela de pagos PagosYa.";
      if (statusCode === 400) {
        friendlyError =
          responseData?.message ||
          responseData?.error ||
          "Datos inválidos enviados a PagosYa Sandbox.";
      } else if (statusCode === 401) {
        friendlyError =
          "Credenciales de PagosYa Sandbox no autorizadas (verifica tu API key 'sk_test_...').";
      } else if (statusCode === 409) {
        friendlyError =
          "Conflicto: Ya existe un checkout creado previamente con esta misma referencia de pedido (DUPLICATE_ORDER_ID).";
      } else if (statusCode === 429) {
        friendlyError =
          "Límite de solicitudes alcanzado en PagosYa Sandbox. Por favor espera unos momentos.";
      } else if (statusCode >= 500) {
        friendlyError =
          "El servicio Sandbox de PagosYa experimentó un error temporal. Intenta de nuevo en unos momentos.";
      }

      return {
        success: false,
        statusCode,
        error: friendlyError,
        detail: responseData,
      };
    }

    // Respuesta exitosa (generalmente 200 o 201)
    // Extraer datos garantizando estructura segura para el frontend
    const qrObj = responseData?.qr || {};
    const sanitizedData = {
      checkout_id: responseData?.checkout_id || responseData?.id || "",
      order_id: responseData?.order_id || orderId,
      status: responseData?.status || "pending",
      livemode: responseData?.livemode === true, // Debe ser false en Sandbox
      qr_code: responseData?.qr_code || "",
      qr_image: responseData?.qr_image || "",
      embedded_enabled: responseData?.embedded_enabled ?? true,
      qr: {
        data_url: qrObj.data_url || responseData?.qr_image || responseData?.qr?.data_url || "",
        base64: qrObj.base64 || responseData?.qr?.base64 || "",
        branded: qrObj.branded ?? true,
      },
      expires_at: responseData?.expires_at || "",
      environment: responseData?.environment || "sandbox",
      warning:
        responseData?.warning ||
        "ESTÁS UTILIZANDO EL AMBIENTE DE PRUEBAS. ESTE QR ES FICTICIO, NO SE PUEDE PAGAR Y NO GENERA CONFIRMACIONES BANCARIAS.",
      checkout_url: responseData?.checkout_url || "",
    };

    return {
      success: true,
      statusCode,
      data: sanitizedData,
    };
  } catch (networkError: any) {
    console.error("[PagosYa Network Error]:", networkError);
    return {
      success: false,
      statusCode: 503,
      error:
        "No se pudo establecer conexión de red con el servicio de PagosYa Sandbox. Verifica tu conexión a internet.",
      detail: networkError?.message || String(networkError),
    };
  }
}
