import React, { useState, useEffect } from "react";
import { OrderRecord, MemberUser, MemberStatus } from "../models/types";
import { db, firebase } from "../models/firebaseModel";
import { authController } from "../controllers/authController";
import { Link2, Copy, MousePointer, CheckCircle, TrendingUp, DollarSign, Calendar, X, RefreshCw, Sparkles, AlertTriangle, Clock, MessageSquare } from "lucide-react";
import confetti from "canvas-confetti";

interface VendorPanelViewProps {
  isOpen: boolean;
  onClose: () => void;
  vendorUid: string;
  vendorEmail: string;
  onLogout: () => void;
}

export const VendorPanelView: React.FC<VendorPanelViewProps> = ({
  isOpen,
  onClose,
  vendorUid,
  vendorEmail,
  onLogout,
}) => {
  const [clics, setClics] = useState<number>(0);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [memberData, setMemberData] = useState<MemberUser | null>(null);

  const affiliateUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${vendorUid}`;
  const rawPhone = memberData?.phone || "";
  const waUrl = rawPhone ? `https://wa.me/${rawPhone}` : "";
  const memberStatus: MemberStatus = memberData?.status || "pendiente";
  const isAuthorized = memberStatus === "autorizado";

  useEffect(() => {
    if (isOpen) {
      loadVendorData();
    }
  }, [isOpen, vendorUid]);

  const loadVendorData = async () => {
    setLoading(true);
    try {
      const user = await authController.getSellerById(vendorUid);
      if (user) {
        setMemberData(user);
        setClics(user.clics || 0);
      } else {
        const userDoc = await db.collection("users").doc(vendorUid).get();
        if (userDoc.exists) {
          const d = userDoc.data()!;
          const data: MemberUser = {
            id: vendorUid,
            nombreCompleto: d.nombreCompleto || d.fullName || "Distribuidor",
            email: d.email || vendorEmail,
            phone: d.phone || "",
            countryCode: d.countryCode || "591",
            role: "vendedor",
            status: d.status || "pendiente",
            clics: d.clics || 0,
            totalVentas: d.totalVentas || 0,
            notasAdmin: d.notasAdmin || "",
            fechaRegistro: d.createdAt ? d.createdAt.toDate?.() || d.createdAt : new Date(),
          };
          setMemberData(data);
          setClics(d.clics || 0);
        }
      }

      const snap = await db.collection("pedidos").where("vendedorId", "==", vendorUid).get();
      const list: OrderRecord[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          clienteNombre: d.clienteNombre || "Cliente",
          clienteCelular: d.clienteCelular || "",
          departamento: d.departamento || "Bolivia",
          productos: d.productos || [],
          total: Number(d.total) || 0,
          vendedorId: vendorUid,
          estado: d.estado || "pendiente",
          fecha: d.fecha ? d.fecha.toDate() : new Date(),
        });
      });

      if (list.length === 0) {
        setOrders([
          {
            id: "ord-ref-1",
            clienteNombre: "Valeria Roca",
            clienteCelular: "59178945612",
            departamento: "Santa Cruz",
            productos: [
              { nombre: "Colágeno Marino Hidrolizado", cantidad: 1, precioUnitario: 205 },
              { nombre: "Fibernat Detox", cantidad: 1, precioUnitario: 95 },
            ],
            total: 300,
            vendedorId: vendorUid,
            estado: "confirmado",
            fecha: new Date(),
          },
          {
            id: "ord-ref-2",
            clienteNombre: "Rodrigo Morales",
            clienteCelular: "59171239874",
            departamento: "La Paz",
            productos: [
              { nombre: "Coffee Life Premium (Ganoderma + Cordyceps)", cantidad: 1, precioUnitario: 215 },
            ],
            total: 215,
            vendedorId: vendorUid,
            estado: "pendiente",
            fecha: new Date(),
          },
        ]);
      } else {
        setOrders(list);
      }
    } catch (e) {
      console.warn("Aviso Firestore vendedor:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!isAuthorized) return;
    navigator.clipboard.writeText(affiliateUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyWa = () => {
    if (!isAuthorized || !waUrl) return;
    navigator.clipboard.writeText(waUrl);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  const handleSimulateClick = async () => {
    if (!isAuthorized) return;
    setClics((prev) => prev + 1);
    try {
      await db.collection("users").doc(vendorUid).set(
        { clics: firebase.firestore.FieldValue.increment(1) },
        { merge: true }
      );
    } catch (e) {
      // Ok
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      await db.collection("pedidos").doc(orderId).update({
        estado: "confirmado",
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, estado: "confirmado" } : o))
      );
      confetti({ particleCount: 100, spread: 70 });
    } catch (e: any) {
      alert("Aviso: " + e.message);
    }
  };

  if (!isOpen) return null;

  const totalOrders = orders.length;
  const confirmedSales = orders
    .filter((o) => o.estado === "confirmado")
    .reduce((acc, o) => acc + o.total, 0);
  const conversionRate = clics > 0 ? ((totalOrders / clics) * 100).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 z-50 bg-[#082836]/95 backdrop-blur-xl flex flex-col text-white overflow-hidden animate-in fade-in duration-200">
      <header className="p-4 sm:p-5 border-b border-cyan-800 bg-[#061e29] flex items-center justify-between">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-white">
              Portal del Distribuidor · Team Life
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{memberData?.nombreCompleto || vendorEmail}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isAuthorized
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : memberStatus === "pendiente"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}
              >
                {memberStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadVendorData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Refrescar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Sesión
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Status Warning Alerts */}
        {!isAuthorized && (
          <div
            className={`p-5 rounded-3xl border flex items-start gap-4 text-left ${
              memberStatus === "pendiente"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : "bg-rose-500/10 border-rose-500/30 text-rose-200"
            }`}
          >
            <div className="p-2 rounded-xl bg-white/10 flex-shrink-0 mt-0.5">
              {memberStatus === "pendiente" ? (
                <Clock className="w-5 h-5 text-amber-300" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-300" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white">
                {memberStatus === "pendiente"
                  ? "Cuenta en Proceso de Autorización"
                  : `Cuenta en Estado: ${memberStatus.toUpperCase()}`}
              </h4>
              <p className="text-xs opacity-90 leading-relaxed">
                {memberStatus === "pendiente"
                  ? "Tu registro ha sido enviado exitosamente al Superadministrador para validación oficial. Mientras permanezca en revisión, tus enlaces de ventas directas no derivarán clientes a tu WhatsApp. Recibirás respuesta pronto."
                  : "Tu cuenta de distribuidor se encuentra temporalmente inactiva o suspendida. Los pedidos y consultas de clientes referidos serán atendidos directamente por la Central Oficial de Team Life."}
              </p>
              {memberData?.notasAdmin && (
                <div className="text-[11px] bg-black/30 p-2.5 rounded-xl border border-white/10 mt-2">
                  <strong>Observación de Administración:</strong> {memberData.notasAdmin}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Affiliate Link Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0b3c4f] via-[#082836] to-[#041a24] border border-cyan-500/30 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300 font-display font-bold text-sm">
              <Link2 className="w-4 h-4" />
              <span>Enlaces Oficiales de Atribución Comercial</span>
            </div>
            <span className="text-[11px] text-cyan-200 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              ID: {vendorUid}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Link */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                1. Enlace a la Vitrina Web con tu Atribución:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={affiliateUrl}
                  className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-xl font-mono text-xs text-cyan-200 select-all"
                />
                <button
                  type="button"
                  disabled={!isAuthorized}
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? "¡Copiado!" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Direct WhatsApp Link */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                2. Enlace Directo a tu WhatsApp Autorizado:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={waUrl || "https://wa.me/591..."}
                  className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-xl font-mono text-xs text-emerald-300 select-all"
                />
                <button
                  type="button"
                  disabled={!isAuthorized || !waUrl}
                  onClick={handleCopyWa}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{copiedWa ? "¡Copiado!" : "Copiar WA"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-400">
              Número registrado para despachos: <strong className="text-white">+{rawPhone || "Pendiente"}</strong>
            </p>
            {isAuthorized && (
              <button
                type="button"
                onClick={handleSimulateClick}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Simula un clic en tu enlace"
              >
                <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simular Visita</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-3xl bg-[#0b3c4f]/40 border border-cyan-800 shadow-lg space-y-2 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Pedidos Recibidos</span>
            </span>
            <div className="font-display font-black text-3xl text-cyan-200">{totalOrders}</div>
          </div>

          <div className="p-6 rounded-3xl bg-[#0b3c4f]/40 border border-cyan-800 shadow-lg space-y-2 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Ventas Confirmadas</span>
            </span>
            <div className="font-display font-black text-3xl text-emerald-400">
              Bs {confirmedSales.toFixed(0)}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#0b3c4f]/40 border border-cyan-800 shadow-lg space-y-2 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MousePointer className="w-4 h-4 text-amber-400" />
              <span>Clics Registrados</span>
            </span>
            <div className="font-display font-black text-3xl text-amber-400">{clics}</div>
          </div>

          <div className="p-6 rounded-3xl bg-[#0b3c4f]/40 border border-cyan-800 shadow-lg space-y-2 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Conversión</span>
            </span>
            <div className="font-display font-black text-3xl text-cyan-400">{conversionRate}%</div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="p-6 rounded-3xl bg-[#0b3c4f]/30 border border-cyan-800/80 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white">Órdenes con tu Código</h3>
            <span className="text-xs text-slate-400">Total: {orders.length}</span>
          </div>

          <div className="space-y-3">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-white">{o.clienteNombre}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        o.estado === "confirmado"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {o.estado}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Celular: <span className="font-mono text-cyan-200">+{o.clienteCelular}</span> · Destino:{" "}
                    <span className="text-cyan-300">{o.departamento}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Items: {o.productos?.map((p) => `${p.nombre} (x${p.cantidad})`).join(", ")}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Monto</div>
                    <div className="font-display font-black text-xl text-cyan-300">Bs {o.total.toFixed(0)}</div>
                  </div>
                  {o.estado !== "confirmado" ? (
                    <button
                      type="button"
                      onClick={() => handleConfirmOrder(o.id!)}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Confirmar Venta
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Aprobado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
