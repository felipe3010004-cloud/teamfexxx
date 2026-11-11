import { db, firebase } from "../models/firebaseModel";
import { CartItem } from "../models/types";
import confetti from "canvas-confetti";

export interface OrderData {
  clientName: string;
  clientPhone: string;
  countryCode: string;
  countryName: string;
  department: string | null;
  items: CartItem[];
  total: number;
  vendedorWhatsapp: string;
  referrerId?: string | null;
}

export class OrderController {
  public async submitOrder(data: OrderData): Promise<{ success: boolean; waUrl: string }> {
    const fullPhone = `+${data.countryCode} ${data.clientPhone}`;
    const destination =
      data.countryCode === "591"
        ? `Bolivia (${data.department || "La Paz"})`
        : `${data.countryName} (+${data.countryCode})`;

    const itemsSummary = data.items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.name} ${item.isCombo ? "(Combo Exclusivo)" : ""} - Bs ${(
            item.price * item.quantity
          ).toFixed(0)}`
      )
      .join("\n");

    const message = encodeURIComponent(
      `🌿 *¡Nuevo Pedido Oficial - Equipo Vida S.R.L. / Team Life!* 🌿\n\n` +
      `👤 *Cliente:* ${data.clientName.trim()}\n` +
      `📱 *Contacto:* ${fullPhone}\n` +
      `📍 *Destino:* ${destination}\n` +
      (data.referrerId ? `🤝 *Vendedor / Ref:* ${data.referrerId}\n` : "") +
      `\n🛒 *Detalle del Pedido:*\n${itemsSummary}\n\n` +
      `💰 *Total a pagar:* Bs ${data.total.toFixed(0)}\n\n` +
      `Por favor indíquenme las cuentas autorizadas para transferencia bancaria o QR y coordinar el despacho oficial. ¡Muchas gracias!`
    );

    const waUrl = `https://wa.me/${data.vendedorWhatsapp}?text=${message}`;

    // 1. Guardar en Firestore colección 'pedidos'
    try {
      await db.collection("pedidos").add({
        clienteNombre: data.clientName.trim(),
        clienteCelular: fullPhone,
        pais: data.countryName,
        departamento: data.department || "Bolivia",
        productos: data.items.map((i) => ({
          nombre: i.name,
          cantidad: i.quantity,
          precioUnitario: i.price,
          isCombo: i.isCombo,
        })),
        total: data.total,
        vendedorId: data.referrerId || null,
        estado: "pendiente",
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn("Aviso Firestore al registrar pedido (guardado local o sin conexión):", err);
    }

    // 2. Confeti festivo
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Ignorar si falla
    }

    return { success: true, waUrl };
  }
}

export const orderController = new OrderController();
