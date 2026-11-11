import React, { useState, useEffect } from "react";
import {
  Product,
  Combo,
  OrderRecord,
  MemberUser,
  MemberStatus,
  AiKnowledgeItem,
  AuditLogItem,
} from "../models/types";
import { db, firebase } from "../models/firebaseModel";
import { authController } from "../controllers/authController";
import { aiController } from "../controllers/aiController";
import { auditController } from "../controllers/auditController";
import { productsModel } from "../models/productsModel";
import { combosModel } from "../models/combosModel";
import { COMPANY_INFO, updateCompanyInfo } from "../models/companyModel";
import { isSafePublicUrl, extractProductFromUrl } from "../utils/urlExtractor";
import {
  Shield,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Users,
  ShoppingBag,
  BookOpen,
  History,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  MessageSquare,
  Copy,
  ExternalLink,
  Edit3,
  Send,
  Bot,
  FileText,
  DollarSign,
  UserPlus,
  Save,
  Check,
  Building,
  Link as LinkIcon,
  Globe,
  Tag,
  KeyRound,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  ArrowRight,
  Package,
} from "lucide-react";
import confetti from "canvas-confetti";

interface AdminPanelViewProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onRefreshProducts: () => void;
  onLogout: () => void;
}

type TabType =
  | "dashboard"
  | "miembros"
  | "catalogo"
  | "pedidos"
  | "ia"
  | "actividades"
  | "configuracion";

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  isOpen,
  onClose,
  products,
  onRefreshProducts,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [combosList, setCombosList] = useState<Combo[]>(() => combosModel.getAll());
  const [knowledgeList, setKnowledgeList] = useState<AiKnowledgeItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string>("");

  // Subtabs for Catalog (Products vs Combos)
  const [catalogSubTab, setCatalogSubTab] = useState<"productos" | "combos">("productos");

  // Member Management Filters & States
  const [memberFilter, setMemberFilter] = useState<string>("todos");
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Member Form
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualCountryCode, setManualCountryCode] = useState("591");
  const [manualRole, setManualRole] = useState<"vendedor" | "admin">("vendedor");
  const [manualStatus, setManualStatus] = useState<MemberStatus>("autorizado");
  const [manualNotes, setManualNotes] = useState("");

  // ==========================================
  // EDIT MEMBER MODAL STATE
  // ==========================================
  const [editingMember, setEditingMember] = useState<MemberUser | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberEmail, setEditMemberEmail] = useState("");
  const [editMemberPhone, setEditMemberPhone] = useState("");
  const [editMemberCountryCode, setEditMemberCountryCode] = useState("591");
  const [editMemberRole, setEditMemberRole] = useState<"vendedor" | "admin">("vendedor");
  const [editMemberStatus, setEditMemberStatus] = useState<MemberStatus>("autorizado");
  const [editMemberNotes, setEditMemberNotes] = useState("");
  const [isSavingMember, setIsSavingMember] = useState(false);

  // ==========================================
  // PRODUCT CREATION FORM (MANUAL)
  // ==========================================
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductMemberPrice, setNewProductMemberPrice] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Nutrición Celular");
  const [newProductImg, setNewProductImg] = useState("");

  // ==========================================
  // EDIT PRODUCT MODAL STATE
  // ==========================================
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState("");
  const [editProdDesc, setEditProdDesc] = useState("");
  const [editProdLongDesc, setEditProdLongDesc] = useState("");
  const [editProdNormalPrice, setEditProdNormalPrice] = useState("");
  const [editProdMemberPrice, setEditProdMemberPrice] = useState("");
  const [editProdPromoPrice, setEditProdPromoPrice] = useState("");
  const [editProdDiscountPercentage, setEditProdDiscountPercentage] = useState("");
  const [editProdCategory, setEditProdCategory] = useState("Nutrición Celular");
  const [editProdImg, setEditProdImg] = useState("");
  const [editProdUrl, setEditProdUrl] = useState("");
  const [editProdCheckoutUrl, setEditProdCheckoutUrl] = useState("");
  const [editProdPresentation, setEditProdPresentation] = useState("");
  const [editProdIngredients, setEditProdIngredients] = useState("");
  const [editProdBenefits, setEditProdBenefits] = useState("");
  const [editProdStatus, setEditProdStatus] = useState<"publicado" | "oculto" | "desactivado">("publicado");
  const [editProdPromoStartDate, setEditProdPromoStartDate] = useState("");
  const [editProdPromoEndDate, setEditProdPromoEndDate] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // ==========================================
  // ADD PRODUCT BY LINK MODAL STATE
  // ==========================================
  const [isAddByLinkOpen, setIsAddByLinkOpen] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState("");
  const [isExtractingLink, setIsExtractingLink] = useState(false);
  const [linkExtractionNotice, setLinkExtractionNotice] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<{
    name: string;
    desc: string;
    normalPrice: string;
    memberPrice: string;
    category: string;
    img: string;
    sourceUrl: string;
    productUrl: string;
  } | null>(null);

  // ==========================================
  // EDIT COMBO MODAL STATE
  // ==========================================
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [editComboName, setEditComboName] = useState("");
  const [editComboDesc, setEditComboDesc] = useState("");
  const [editComboPrice, setEditComboPrice] = useState("");
  const [editComboPromoPrice, setEditComboPromoPrice] = useState("");
  const [editComboProfitPercentage, setEditComboProfitPercentage] = useState("");
  const [editComboCommissionable, setEditComboCommissionable] = useState("");
  const [editComboImg, setEditComboImg] = useState("");
  const [editComboIncludedProducts, setEditComboIncludedProducts] = useState<string[]>([]);
  const [editComboNewComponent, setEditComboNewComponent] = useState("");
  const [editComboUrl, setEditComboUrl] = useState("");
  const [editComboStatus, setEditComboStatus] = useState<"publicado" | "oculto" | "desactivado">("publicado");
  const [editComboPromoStartDate, setEditComboPromoStartDate] = useState("");
  const [editComboPromoEndDate, setEditComboPromoEndDate] = useState("");
  const [isSavingCombo, setIsSavingCombo] = useState(false);

  // ==========================================
  // EDIT COMPANY CONFIG MODAL / FORM STATE
  // ==========================================
  const [isEditingCompanyConfig, setIsEditingCompanyConfig] = useState(false);
  const [cfgName, setCfgName] = useState(COMPANY_INFO.name);
  const [cfgCommercialName, setCfgCommercialName] = useState(COMPANY_INFO.commercialName);
  const [cfgNit, setCfgNit] = useState(COMPANY_INFO.nit);
  const [cfgSenasag, setCfgSenasag] = useState(COMPANY_INFO.senasag);
  const [cfgSeprec, setCfgSeprec] = useState(COMPANY_INFO.seprec);
  const [cfgFounders, setCfgFounders] = useState(COMPANY_INFO.founders);
  const [cfgDefaultWhatsapp, setCfgDefaultWhatsapp] = useState(COMPANY_INFO.defaultWhatsapp);
  const [cfgFoundersProfile, setCfgFoundersProfile] = useState(COMPANY_INFO.foundersProfile);
  const [cfgMission, setCfgMission] = useState(COMPANY_INFO.mission);
  const [cfgVision, setCfgVision] = useState(COMPANY_INFO.vision);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Knowledge Form
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState<AiKnowledgeItem["category"]>("general");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeStatus, setKnowledgeStatus] = useState<"publicado" | "borrador">("publicado");
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);

  // AI Simulator Testing Tool
  const [testPrompt, setTestPrompt] = useState("");
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testRecommendedProduct, setTestRecommendedProduct] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(""), 4500);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Load orders
      const ordersSnap = await db.collection("pedidos").orderBy("fecha", "desc").limit(50).get();
      const loadedOrders: OrderRecord[] = [];
      ordersSnap.forEach((doc) => {
        const d = doc.data();
        loadedOrders.push({
          id: doc.id,
          clienteNombre: d.clienteNombre || "Cliente",
          clienteCelular: d.clienteCelular || "",
          departamento: d.departamento || "Bolivia",
          productos: d.productos || [],
          total: Number(d.total) || 0,
          vendedorId: d.vendedorId || null,
          estado: d.estado || "pendiente",
          fecha: d.fecha ? d.fecha.toDate() : new Date(),
        });
      });
      setOrders(loadedOrders);

      // 2. Load members
      const loadedMembers = await authController.getAllMembers();
      setMembers(loadedMembers);

      // 3. Load combos
      try {
        const combosSnap = await db.collection("combos").get();
        if (!combosSnap.empty) {
          combosSnap.forEach((doc) => {
            const d = doc.data();
            combosModel.updateCombo(doc.id, {
              name: d.name,
              comboPrice: Number(d.comboPrice),
              promoPrice: d.promoPrice ? Number(d.promoPrice) : undefined,
              desc: d.desc,
              img: d.img,
              includedProducts: d.includedProducts,
              profitPercentage: d.profitPercentage ? Number(d.profitPercentage) : undefined,
              commissionable: d.commissionable ? Number(d.commissionable) : undefined,
              comboUrl: d.comboUrl,
              status: d.status || "publicado",
            });
          });
        }
      } catch (err) {
        // Ok fallback
      }
      setCombosList(combosModel.getAll());

      // 4. Load products from Firestore
      try {
        const prodsSnap = await db.collection("productos").get();
        if (!prodsSnap.empty) {
          prodsSnap.forEach((doc) => {
            const d = doc.data();
            productsModel.addProduct({
              id: doc.id,
              name: d.nombre || d.name,
              normalPrice: Number(d.precio || d.normalPrice),
              memberPrice: d.precioSocio ? Number(d.precioSocio) : Number(d.memberPrice),
              promoPrice: d.promoPrice ? Number(d.promoPrice) : undefined,
              desc: d.descripcion || d.desc || "",
              longDesc: d.longDesc,
              category: d.categoria || d.category,
              img: d.imagen || d.img || "/assets/aistudio/colageno_f2bee034.jpeg",
              status: d.status || "publicado",
              productUrl: d.productUrl,
              checkoutUrl: d.checkoutUrl,
              sourceUrl: d.sourceUrl,
            });
          });
          onRefreshProducts();
        }
      } catch (err) {
        // Ok
      }

      // 5. Load company config from Firestore
      try {
        const configDoc = await db.collection("config").doc("empresa").get();
        if (configDoc.exists) {
          const cfg = configDoc.data()!;
          updateCompanyInfo(cfg as any);
          setCfgName(cfg.name || COMPANY_INFO.name);
          setCfgCommercialName(cfg.commercialName || COMPANY_INFO.commercialName);
          setCfgNit(cfg.nit || COMPANY_INFO.nit);
          setCfgSenasag(cfg.senasag || COMPANY_INFO.senasag);
          setCfgSeprec(cfg.seprec || COMPANY_INFO.seprec);
          setCfgFounders(cfg.founders || COMPANY_INFO.founders);
          setCfgDefaultWhatsapp(cfg.defaultWhatsapp || COMPANY_INFO.defaultWhatsapp);
          setCfgFoundersProfile(cfg.foundersProfile || COMPANY_INFO.foundersProfile);
          setCfgMission(cfg.mission || COMPANY_INFO.mission);
          setCfgVision(cfg.vision || COMPANY_INFO.vision);
        }
      } catch (err) {
        // Ok
      }

      // 6. Load knowledge base
      const loadedKnowledge = await aiController.getAllKnowledgeItems();
      setKnowledgeList(loadedKnowledge);

      // 7. Load audit logs
      const loadedLogs = await auditController.getRecentLogs(40);
      setAuditLogs(loadedLogs);
    } catch (err) {
      console.warn("Nota Firestore Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PRODUCT EDIT HANDLERS
  // ==========================================
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditProdName(prod.name || "");
    setEditProdDesc(prod.desc || "");
    setEditProdLongDesc(prod.longDesc || "");
    setEditProdNormalPrice(prod.normalPrice ? String(prod.normalPrice) : "");
    setEditProdMemberPrice(prod.memberPrice ? String(prod.memberPrice) : "");
    setEditProdPromoPrice(prod.promoPrice ? String(prod.promoPrice) : "");
    setEditProdDiscountPercentage(prod.discountPercentage ? String(prod.discountPercentage) : "");
    setEditProdCategory(prod.category || "Nutrición Celular");
    setEditProdImg(prod.img || "");
    setEditProdUrl(prod.productUrl || `/${prod.id}`);
    setEditProdCheckoutUrl(prod.checkoutUrl || "");
    setEditProdPresentation(prod.presentation || "");
    setEditProdIngredients(prod.ingredients ? prod.ingredients.join(", ") : "");
    setEditProdBenefits(prod.benefits ? prod.benefits.join("\n") : "");
    setEditProdStatus(prod.status || "publicado");
    setEditProdPromoStartDate(prod.promoStartDate || "");
    setEditProdPromoEndDate(prod.promoEndDate || "");
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null);
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editProdName.trim()) {
      alert("El nombre del producto es obligatorio.");
      return;
    }
    const normalP = parseFloat(editProdNormalPrice);
    if (isNaN(normalP) || normalP < 0) {
      alert("El precio normal debe ser un número válido mayor o igual a 0.");
      return;
    }

    const memberP = editProdMemberPrice
      ? parseFloat(editProdMemberPrice)
      : Math.round(normalP * 0.6);
    const promoP = editProdPromoPrice ? parseFloat(editProdPromoPrice) : undefined;
    const discountPct = editProdDiscountPercentage
      ? parseFloat(editProdDiscountPercentage)
      : undefined;

    setIsSavingProduct(true);
    try {
      const ingredientsArray = editProdIngredients
        ? editProdIngredients.split(",").map((i) => i.trim()).filter(Boolean)
        : editingProduct.ingredients || [];
      const benefitsArray = editProdBenefits
        ? editProdBenefits.split("\n").map((b) => b.trim()).filter(Boolean)
        : editingProduct.benefits || [];

      const updatedPayload: Partial<Product> = {
        name: editProdName.trim(),
        desc: editProdDesc.trim(),
        longDesc: editProdLongDesc.trim(),
        normalPrice: normalP,
        memberPrice: memberP,
        promoPrice: promoP,
        discountPercentage: discountPct,
        category: editProdCategory,
        img: editProdImg.trim() || editingProduct.img,
        productUrl: editProdUrl.trim(),
        checkoutUrl: editProdCheckoutUrl.trim(),
        presentation: editProdPresentation.trim(),
        ingredients: ingredientsArray,
        benefits: benefitsArray,
        status: editProdStatus,
        promoStartDate: editProdPromoStartDate,
        promoEndDate: editProdPromoEndDate,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // 1. Save in Firestore preserving doc ID
      await db.collection("productos").doc(editingProduct.id).set(
        {
          nombre: updatedPayload.name,
          descripcion: updatedPayload.desc,
          longDesc: updatedPayload.longDesc,
          precio: updatedPayload.normalPrice,
          precioSocio: updatedPayload.memberPrice,
          promoPrice: updatedPayload.promoPrice || null,
          categoria: updatedPayload.category,
          imagen: updatedPayload.img,
          productUrl: updatedPayload.productUrl,
          checkoutUrl: updatedPayload.checkoutUrl,
          status: updatedPayload.status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Update memory model
      productsModel.updateProduct(editingProduct.id, updatedPayload);
      onRefreshProducts();

      // 3. Audit log
      await auditController.logEvent(
        "Modificación de producto",
        "catalogo",
        `Producto "${updatedPayload.name}" (ID: ${editingProduct.id}) actualizado. Precio: Bs ${normalP}, Socio: Bs ${memberP}, Estado: ${editProdStatus}.`
      );

      showFeedback(`¡Producto "${updatedPayload.name}" actualizado correctamente!`);
      setEditingProduct(null);
      loadAllData();
    } catch (err: any) {
      alert("Error al actualizar producto: " + err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ==========================================
  // ADD PRODUCT BY LINK HANDLERS
  // ==========================================
  const handleAnalyzeLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkExtractionNotice(null);

    const safeCheck = isSafePublicUrl(linkInputUrl);
    if (!safeCheck.valid) {
      alert(safeCheck.reason);
      return;
    }

    setIsExtractingLink(true);
    try {
      const result = await extractProductFromUrl(linkInputUrl);
      setExtractedPreview({
        name: result.data.name || "Producto Importado",
        desc: result.data.desc || "",
        normalPrice: result.data.normalPrice ? String(result.data.normalPrice) : "190",
        memberPrice: result.data.promoPrice
          ? String(result.data.promoPrice)
          : String(Math.round((result.data.normalPrice || 190) * 0.6)),
        category: result.data.category || "Nutrición Celular",
        img:
          result.data.img ||
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
        sourceUrl: result.data.sourceUrl,
        productUrl: result.data.productUrl || result.data.sourceUrl,
      });

      if (result.notice) {
        setLinkExtractionNotice(result.notice);
      }
    } catch (err: any) {
      alert("Error analizando URL: " + err.message);
    } finally {
      setIsExtractingLink(false);
    }
  };

  const handleConfirmAddByLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedPreview) return;

    const normalP = parseFloat(extractedPreview.normalPrice);
    if (isNaN(normalP) || normalP <= 0) {
      alert("Por favor introduce un precio normal válido.");
      return;
    }
    const memberP = extractedPreview.memberPrice
      ? parseFloat(extractedPreview.memberPrice)
      : Math.round(normalP * 0.6);

    try {
      const docRef = await db.collection("productos").add({
        nombre: extractedPreview.name.trim(),
        descripcion: extractedPreview.desc.trim(),
        precio: normalP,
        precioSocio: memberP,
        categoria: extractedPreview.category,
        imagen: extractedPreview.img,
        sourceUrl: extractedPreview.sourceUrl,
        productUrl: extractedPreview.productUrl,
        activo: true,
        status: "publicado",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      const newProd: Product = {
        id: docRef.id,
        name: extractedPreview.name.trim(),
        desc: extractedPreview.desc.trim(),
        normalPrice: normalP,
        memberPrice: memberP,
        category: extractedPreview.category,
        img: extractedPreview.img,
        sourceUrl: extractedPreview.sourceUrl,
        productUrl: extractedPreview.productUrl,
        status: "publicado",
      };

      productsModel.addProduct(newProd);
      onRefreshProducts();

      await auditController.logEvent(
        "Producto agregado mediante enlace",
        "catalogo",
        `Producto "${newProd.name}" importado desde ${newProd.sourceUrl}. ID: ${docRef.id}.`
      );

      showFeedback(`¡Producto "${newProd.name}" importado y guardado en catálogo!`);
      setIsAddByLinkOpen(false);
      setLinkInputUrl("");
      setExtractedPreview(null);
      setLinkExtractionNotice(null);
      loadAllData();
    } catch (err: any) {
      alert("Error guardando producto: " + err.message);
    }
  };

  // ==========================================
  // COMBO EDIT HANDLERS
  // ==========================================
  const handleOpenEditCombo = (combo: Combo) => {
    setEditingCombo(combo);
    setEditComboName(combo.name || "");
    setEditComboDesc(combo.desc || "");
    setEditComboPrice(String(combo.comboPrice || ""));
    setEditComboPromoPrice(combo.promoPrice ? String(combo.promoPrice) : "");
    setEditComboProfitPercentage(
      combo.profitPercentage ? String(combo.profitPercentage) : "40"
    );
    setEditComboCommissionable(
      combo.commissionable ? String(combo.commissionable) : ""
    );
    setEditComboImg(combo.img || "");
    setEditComboIncludedProducts(combo.includedProducts ? [...combo.includedProducts] : []);
    setEditComboNewComponent("");
    setEditComboUrl(combo.comboUrl || "");
    setEditComboStatus(combo.status || "publicado");
    setEditComboPromoStartDate(combo.promoStartDate || "");
    setEditComboPromoEndDate(combo.promoEndDate || "");
  };

  const handleCancelEditCombo = () => {
    setEditingCombo(null);
  };

  const handleAddComboComponent = () => {
    if (!editComboNewComponent.trim()) return;
    setEditComboIncludedProducts((prev) => [...prev, editComboNewComponent.trim()]);
    setEditComboNewComponent("");
  };

  const handleRemoveComboComponent = (index: number) => {
    setEditComboIncludedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCombo) return;

    if (!editComboName.trim()) {
      alert("El nombre del combo es obligatorio.");
      return;
    }
    const priceNum = parseFloat(editComboPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert("El precio del combo debe ser un número válido mayor o igual a 0.");
      return;
    }

    setIsSavingCombo(true);
    try {
      const updatedPayload: Partial<Combo> = {
        name: editComboName.trim(),
        desc: editComboDesc.trim(),
        comboPrice: priceNum,
        promoPrice: editComboPromoPrice ? parseFloat(editComboPromoPrice) : undefined,
        profitPercentage: editComboProfitPercentage ? parseFloat(editComboProfitPercentage) : undefined,
        commissionable: editComboCommissionable ? parseFloat(editComboCommissionable) : undefined,
        img: editComboImg.trim() || editingCombo.img,
        includedProducts: editComboIncludedProducts,
        comboUrl: editComboUrl.trim(),
        status: editComboStatus,
        promoStartDate: editComboPromoStartDate,
        promoEndDate: editComboPromoEndDate,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // 1. Save in Firestore maintaining original ID
      await db.collection("combos").doc(editingCombo.id).set(
        {
          name: updatedPayload.name,
          desc: updatedPayload.desc,
          comboPrice: updatedPayload.comboPrice,
          promoPrice: updatedPayload.promoPrice || null,
          profitPercentage: updatedPayload.profitPercentage || null,
          commissionable: updatedPayload.commissionable || null,
          img: updatedPayload.img,
          includedProducts: updatedPayload.includedProducts,
          comboUrl: updatedPayload.comboUrl,
          status: updatedPayload.status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Update memory model
      combosModel.updateCombo(editingCombo.id, updatedPayload);
      setCombosList(combosModel.getAll());

      // 3. Audit log
      await auditController.logEvent(
        "Modificación de combo",
        "catalogo",
        `Combo "${updatedPayload.name}" (ID: ${editingCombo.id}) actualizado. Precio: Bs ${priceNum}, Componentes: ${editComboIncludedProducts.length}.`
      );

      showFeedback(`¡Combo "${updatedPayload.name}" actualizado correctamente!`);
      setEditingCombo(null);
      loadAllData();
    } catch (err: any) {
      alert("Error al actualizar combo: " + err.message);
    } finally {
      setIsSavingCombo(false);
    }
  };

  // ==========================================
  // MEMBER EDIT HANDLERS
  // ==========================================
  const handleOpenEditMember = (m: MemberUser) => {
    setEditingMember(m);
    setEditMemberName(m.nombreCompleto || "");
    setEditMemberEmail(m.email || "");
    setEditMemberPhone(m.phone || "");
    setEditMemberCountryCode(m.countryCode || "591");
    setEditMemberRole(m.role || "vendedor");
    setEditMemberStatus(m.status || "autorizado");
    setEditMemberNotes(m.notasAdmin || "");
  };

  const handleCancelEditMember = () => {
    setEditingMember(null);
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    if (!editMemberName.trim()) {
      alert("El nombre completo es obligatorio.");
      return;
    }
    if (!editMemberEmail.trim() || !editMemberEmail.includes("@")) {
      alert("Por favor introduce un correo válido.");
      return;
    }

    setIsSavingMember(true);
    try {
      const res = await authController.updateMemberProfile(editingMember.id, {
        nombreCompleto: editMemberName,
        email: editMemberEmail,
        phone: editMemberPhone,
        countryCode: editMemberCountryCode,
        role: editMemberRole,
        status: editMemberStatus,
        notasAdmin: editMemberNotes,
      });

      showFeedback(
        `¡Perfil de "${editMemberName}" actualizado exitosamente!` +
          (res.requiresAuthReset
            ? " Se actualizó Firestore; si requiere nueva clave usa el botón de restablecimiento de contraseña."
            : "")
      );

      setEditingMember(null);
      loadAllData();
    } catch (err: any) {
      alert("Error al guardar miembro: " + err.message);
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleSendMemberPasswordReset = async (email: string) => {
    if (!confirm(`¿Deseas enviar un correo oficial de restablecimiento de contraseña a ${email}?`)) {
      return;
    }
    try {
      await authController.sendPasswordReset(email);
      showFeedback(`¡Correo de restablecimiento enviado a ${email}!`);
    } catch (err: any) {
      alert("Aviso de Firebase Auth: " + err.message);
    }
  };

  // Quick Member Status Update
  const handleUpdateMemberStatus = async (
    userId: string,
    newStatus: MemberStatus,
    memberName: string
  ) => {
    try {
      await authController.updateMemberStatus(userId, newStatus);
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, status: newStatus } : m))
      );
      showFeedback(`Estado de "${memberName}" actualizado a: ${newStatus.toUpperCase()}`);
      loadAllData();
    } catch (e: any) {
      alert("Error actualizando miembro: " + e.message);
    }
  };

  // Create Manual Member
  const handleCreateManualMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim() || !manualPhone.trim()) {
      alert("Por favor completa nombre, email y teléfono.");
      return;
    }

    try {
      await authController.createMemberManual({
        fullName: manualName,
        email: manualEmail,
        phone: manualPhone,
        countryCode: manualCountryCode,
        role: manualRole,
        status: manualStatus,
        notasAdmin: manualNotes,
      });

      showFeedback(`¡Miembro "${manualName}" creado exitosamente!`);
      setIsNewMemberModalOpen(false);
      setManualName("");
      setManualEmail("");
      setManualPhone("");
      setManualNotes("");
      loadAllData();
    } catch (e: any) {
      alert("Error al registrar miembro: " + e.message);
    }
  };

  // Create Product (Manual)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice) return;

    try {
      const normalP = parseFloat(newProductPrice);
      const memberP = newProductMemberPrice ? parseFloat(newProductMemberPrice) : Math.round(normalP * 0.6);
      const imgToUse =
        newProductImg.trim() ||
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80";

      const docRef = await db.collection("productos").add({
        nombre: newProductName.trim(),
        precio: normalP,
        precioSocio: memberP,
        descripcion: newProductDesc.trim(),
        categoria: newProductCategory,
        imagen: imgToUse,
        activo: true,
        status: "publicado",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      const newProd: Product = {
        id: docRef.id,
        name: newProductName.trim(),
        normalPrice: normalP,
        memberPrice: memberP,
        desc: newProductDesc.trim(),
        category: newProductCategory,
        img: imgToUse,
        status: "publicado",
      };

      productsModel.addProduct(newProd);

      await auditController.logEvent(
        "Creación de producto",
        "catalogo",
        `Producto "${newProductName.trim()}" agregado al catálogo por Bs ${normalP} (Socio Bs ${memberP}). ID: ${docRef.id}.`
      );

      showFeedback(`¡Producto "${newProductName}" guardado en catálogo!`);
      setNewProductName("");
      setNewProductPrice("");
      setNewProductMemberPrice("");
      setNewProductDesc("");
      setNewProductImg("");
      onRefreshProducts();
      loadAllData();
    } catch (err: any) {
      alert(`Aviso al crear producto: ${err.message}`);
    }
  };

  // ==========================================
  // COMPANY CONFIG EDIT HANDLERS
  // ==========================================
  const handleSaveCompanyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);

    try {
      const payload = {
        name: cfgName.trim(),
        commercialName: cfgCommercialName.trim(),
        nit: cfgNit.trim(),
        senasag: cfgSenasag.trim(),
        seprec: cfgSeprec.trim(),
        founders: cfgFounders.trim(),
        defaultWhatsapp: authController.cleanPhone(cfgDefaultWhatsapp, "591"),
        foundersProfile: cfgFoundersProfile.trim(),
        mission: cfgMission.trim(),
        vision: cfgVision.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("config").doc("empresa").set(payload, { merge: true });
      updateCompanyInfo(payload as any);

      await auditController.logEvent(
        "Modificación de configuración del sistema",
        "sistema",
        `Datos fiscales y comerciales actualizados. NIT: ${payload.nit}, WhatsApp Central: +${payload.defaultWhatsapp}.`
      );

      showFeedback("¡Configuración del sistema guardada con éxito en Firestore!");
      setIsEditingCompanyConfig(false);
      loadAllData();
    } catch (err: any) {
      alert("Error guardando configuración: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Order Status
  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: "pendiente" | "confirmado" | "entregado"
  ) => {
    try {
      await db.collection("pedidos").doc(orderId).update({
        estado: newStatus,
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, estado: newStatus } : o))
      );
      await auditController.logEvent(
        "Actualización de pedido",
        "pedidos",
        `Pedido ID: ${orderId} cambiado a estado "${newStatus}".`
      );
      if (newStatus === "confirmado") {
        confetti({ particleCount: 70, spread: 60 });
      }
      showFeedback(`Pedido actualizado a estado: ${newStatus.toUpperCase()}`);
      loadAllData();
    } catch (e: any) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, estado: newStatus } : o))
      );
    }
  };

  // Knowledge Save
  const handleSaveKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!knowledgeTitle.trim() || !knowledgeContent.trim()) {
      alert("Por favor completa el título y el contenido del conocimiento.");
      return;
    }

    try {
      await aiController.saveKnowledgeItem({
        id: editingKnowledgeId || undefined,
        title: knowledgeTitle,
        category: knowledgeCategory,
        content: knowledgeContent,
        status: knowledgeStatus,
      });

      showFeedback(
        editingKnowledgeId
          ? "Artículo de conocimiento actualizado correctamente."
          : "¡Nuevo artículo de conocimiento incorporado al cerebro de la IA!"
      );

      setEditingKnowledgeId(null);
      setKnowledgeTitle("");
      setKnowledgeContent("");
      setKnowledgeStatus("publicado");
      loadAllData();
    } catch (e: any) {
      alert("Error guardando conocimiento: " + e.message);
    }
  };

  const handleEditKnowledge = (item: AiKnowledgeItem) => {
    setEditingKnowledgeId(item.id);
    setKnowledgeTitle(item.title);
    setKnowledgeCategory(item.category);
    setKnowledgeContent(item.content);
    setKnowledgeStatus(item.status === "borrador" ? "borrador" : "publicado");
  };

  const handleDeleteKnowledge = async (item: AiKnowledgeItem) => {
    if (!confirm(`¿Eliminar el artículo "${item.title}" del centro de conocimiento?`)) return;
    try {
      await aiController.deleteKnowledgeItem(item.id, item.title);
      showFeedback(`Artículo "${item.title}" eliminado.`);
      loadAllData();
    } catch (e: any) {
      alert("Error eliminando conocimiento: " + e.message);
    }
  };

  // Test AI prompt
  const handleTestAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim()) return;
    setTestResponse("Consultando a Gemini con contexto oficial...");
    try {
      const res = await aiController.generateResponse(testPrompt);
      setTestResponse(res.reply);
      setTestRecommendedProduct(
        res.recommendedProduct?.name || res.recommendedCombo?.name || null
      );
    } catch {
      setTestResponse("Error al consultar la inteligencia artificial.");
    }
  };

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isOpen) return null;

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesStatus = memberFilter === "todos" ? true : m.status === memberFilter;
    const matchesSearch =
      memberSearch === "" ||
      m.nombreCompleto.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.phone.includes(memberSearch);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = members.filter((m) => m.status === "pendiente").length;
  const authorizedCount = members.filter((m) => m.status === "autorizado").length;
  const totalRevenue = orders.reduce(
    (acc, o) => acc + (o.estado === "confirmado" ? o.total : 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#090217]/95 backdrop-blur-2xl flex flex-col text-white overflow-hidden animate-in fade-in duration-200">
      {/* Superadmin Top Header */}
      <header className="px-5 py-4 border-b border-purple-500/20 bg-[#0e0422] flex items-center justify-between">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Shield className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-lg sm:text-xl text-white">
                Superadministrador · Team Life Company S.R.L.
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase">
                Panel Único Central
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Gestión total de modificaciones: productos, combos, miembros, precios y enlaces
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusFeedback && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{statusFeedback}</span>
            </div>
          )}
          <button
            type="button"
            onClick={loadAllData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Refrescar datos de Firestore"
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
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tabs Navigation Bar */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#14062f] border-b border-purple-500/20 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "dashboard"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Resumen General</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("miembros")}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "miembros"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Miembros & Vendedores</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("catalogo")}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "catalogo"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Catálogo & Combos ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pedidos")}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "pedidos"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Despacho de Pedidos ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ia")}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "ia"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-cyan-300" />
          <span>Centro de Conocimiento IA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("actividades")}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "actividades"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historial de Actividades</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("configuracion")}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "configuracion"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configuración del Sistema</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 text-left">
        {/* ========================================================= */}
        {/* TAB 1: RESUMEN GENERAL (DASHBOARD) */}
        {/* ========================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {pendingCount > 0 && (
              <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Tienes {pendingCount} solicitud(es) de distribuidores pendientes de autorización
                    </h4>
                    <p className="text-xs text-amber-200/80">
                      Revisa y autoriza a los nuevos miembros para que puedan derivar pedidos a sus números de WhatsApp.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("miembros");
                    setMemberFilter("pendiente");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Ver Pendientes
                </button>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 shadow-lg space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Miembros Totales</span>
                </span>
                <div className="font-display font-black text-3xl text-cyan-300">{members.length}</div>
                <span className="text-[10px] text-slate-400">{authorizedCount} autorizados</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 shadow-lg space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pendientes</span>
                </span>
                <div className="font-display font-black text-3xl text-amber-400">{pendingCount}</div>
                <span className="text-[10px] text-amber-300/80">Esperando aprobación</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 shadow-lg space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                  <span>Productos Activos</span>
                </span>
                <div className="font-display font-black text-3xl text-purple-300">{products.length}</div>
                <span className="text-[10px] text-slate-400">Catálogo oficial</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 shadow-lg space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ventas Confirmadas</span>
                </span>
                <div className="font-display font-black text-3xl text-emerald-400">
                  Bs {totalRevenue.toFixed(0)}
                </div>
                <span className="text-[10px] text-slate-400">{orders.length} pedidos totales</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 shadow-lg space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Artículos IA</span>
                </span>
                <div className="font-display font-black text-3xl text-cyan-400">{knowledgeList.length}</div>
                <span className="text-[10px] text-slate-400">Conocimientos indexados</span>
              </div>
            </div>

            {/* Quick Orders & Audit Log Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-[#13072b] border border-purple-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-white">Últimos Pedidos</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pedidos")}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                  >
                    Ver todos →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {orders.slice(0, 4).map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">{o.clienteNombre}</div>
                        <div className="text-[11px] text-slate-400">
                          +{o.clienteCelular} · {o.departamento}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-amber-400 text-sm">Bs {o.total.toFixed(0)}</div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            o.estado === "confirmado"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {o.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#13072b] border border-purple-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-white">Actividades Recientes</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("actividades")}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                  >
                    Ver bitácora →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5 text-xs"
                    >
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-bold text-white">{log.action}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{log.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MIEMBROS & VENDEDORES (EDICIÓN Y MODIFICACIÓN) */}
        {/* ========================================================= */}
        {activeTab === "miembros" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-black text-xl text-white">
                  Red Oficial de Miembros & Vendedores
                </h3>
                <p className="text-xs text-slate-400">
                  Modificación de perfiles, correos, números de WhatsApp, roles, notas y estados de autorización.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewMemberModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrar Miembro Manual</span>
              </button>
            </div>

            {/* Filters Bar */}
            <div className="p-4 rounded-2xl bg-[#13072b] border border-purple-500/20 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs">
                {["todos", "pendiente", "autorizado", "suspendido", "inactivo"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMemberFilter(st)}
                    className={`px-3 py-1.5 rounded-xl capitalize font-bold transition-all cursor-pointer ${
                      memberFilter === st
                        ? "bg-purple-600 text-white shadow"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar por nombre, correo o celular..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center bg-[#13072b] rounded-3xl border border-white/10 text-slate-400 text-xs">
                  No se encontraron miembros con el filtro seleccionado.
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const waUrl = m.phone ? `https://wa.me/${m.phone}` : "";
                  const storeUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${m.id}`;

                  return (
                    <div
                      key={m.id}
                      className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-bold text-base text-white">
                            {m.nombreCompleto}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              m.status === "autorizado"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : m.status === "pendiente"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            }`}
                          >
                            {m.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 uppercase">
                            {m.role}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            Email: <strong className="text-white font-mono">{m.email}</strong>
                          </span>
                          <span>
                            WhatsApp: <strong className="text-cyan-300 font-mono">+{m.phone || "No asignado"}</strong>
                          </span>
                          <span>
                            Clics: <strong className="text-amber-300 font-mono">{m.clics || 0}</strong>
                          </span>
                        </div>

                        {/* Individual Links */}
                        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                          {waUrl && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(waUrl, `wa-${m.id}`)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Copiar enlace individual de WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{copiedId === `wa-${m.id}` ? "¡WA Copiado!" : "Enlace WhatsApp"}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(storeUrl, `ref-${m.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Copiar enlace a vitrina con atribución"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedId === `ref-${m.id}` ? "¡Ref Copiado!" : "Link Vitrina ?ref="}</span>
                          </button>
                        </div>

                        {m.notasAdmin && (
                          <div className="text-[11px] text-slate-400 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 inline-block">
                            Nota admin: {m.notasAdmin}
                          </div>
                        )}
                      </div>

                      {/* Actions: Edit Profile Button & Status toggles */}
                      <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMember(m)}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {m.status !== "autorizado" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateMemberStatus(m.id, "autorizado", m.nombreCompleto)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Autorizar
                          </button>
                        )}
                        {m.status !== "suspendido" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateMemberStatus(m.id, "suspendido", m.nombreCompleto)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* MODAL: EDIT MEMBER PROFILE */}
            {editingMember && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-lg my-6 p-6 sm:p-7 rounded-3xl bg-[#14062f] border border-purple-500/30 shadow-2xl space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white">
                          Editar Miembro: {editingMember.nombreCompleto}
                        </h4>
                        <span className="text-[11px] text-slate-400">ID: {editingMember.id}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEditMember}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditMember} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Nombre y Apellidos *</label>
                      <input
                        type="text"
                        required
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        value={editMemberEmail}
                        onChange={(e) => setEditMemberEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="text-slate-400">Actualiza el perfil de Firestore.</span>
                        <button
                          type="button"
                          onClick={() => handleSendMemberPasswordReset(editMemberEmail)}
                          className="text-purple-300 hover:text-purple-200 font-bold underline cursor-pointer"
                        >
                          Enviar enlace de cambio de contraseña (Auth)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">
                        Número de Celular / WhatsApp (con código de país) *
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={editMemberCountryCode}
                          onChange={(e) => setEditMemberCountryCode(e.target.value)}
                          className="w-28 px-2 py-2.5 bg-[#1b0840] border border-white/15 rounded-xl text-white"
                        >
                          <option value="591">🇧🇴 +591</option>
                          <option value="54">🇦🇷 +54</option>
                          <option value="55">🇧🇷 +55</option>
                          <option value="56">🇨🇱 +56</option>
                          <option value="51">🇵🇪 +51</option>
                          <option value="1">🇺🇸 +1</option>
                        </select>
                        <input
                          type="text"
                          required
                          value={editMemberPhone}
                          onChange={(e) => setEditMemberPhone(e.target.value)}
                          placeholder="72019482"
                          className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>
                      <span className="text-[10px] text-cyan-300/80 mt-1 block">
                        Enlace WhatsApp regenerado: https://wa.me/
                        {authController.cleanPhone(editMemberPhone, editMemberCountryCode)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Rol</label>
                        <select
                          value={editMemberRole}
                          onChange={(e: any) => setEditMemberRole(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/15 rounded-xl text-white"
                        >
                          <option value="vendedor">Vendedor / Distribuidor</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Estado de Cuenta</label>
                        <select
                          value={editMemberStatus}
                          onChange={(e: any) => setEditMemberStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/15 rounded-xl text-white"
                        >
                          <option value="autorizado">Autorizado</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="suspendido">Suspendido</option>
                          <option value="inactivo">Inactivo</option>
                          <option value="no_autorizado">No Autorizado</option>
                        </select>
                      </div>
                    </div>

                    {(editMemberStatus === "suspendido" || editMemberStatus === "inactivo") && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                        ⚠️ <strong>Aviso:</strong> Al suspender a este miembro, los clientes que abran su enlace serán atendidos directamente por la Central Oficial de Team Life para garantizar su pedido.
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Notas del Administrador</label>
                      <textarea
                        rows={2}
                        value={editMemberNotes}
                        onChange={(e) => setEditMemberNotes(e.target.value)}
                        placeholder="Observación o motivo de cambio..."
                        className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={isSavingMember}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-101 transition-transform cursor-pointer disabled:opacity-50"
                      >
                        {isSavingMember ? "Guardando Cambios..." : "Guardar Cambios del Miembro"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditMember}
                        className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal Manual Member Registration */}
            {isNewMemberModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-md p-6 rounded-3xl bg-[#14062f] border border-purple-500/30 shadow-2xl space-y-4 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-purple-400" />
                      <span>Registrar Miembro Manualmente</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsNewMemberModalOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateManualMember} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1">Nombre y Apellidos *</label>
                      <input
                        type="text"
                        required
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Ej. Rodrigo Morales"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="rodrigo@teamlife.com"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Celular / WhatsApp *</label>
                      <div className="flex gap-2">
                        <select
                          value={manualCountryCode}
                          onChange={(e) => setManualCountryCode(e.target.value)}
                          className="w-24 px-2 py-2 bg-[#1b0840] border border-white/10 rounded-xl text-white"
                        >
                          <option value="591">🇧🇴 +591</option>
                          <option value="54">🇦🇷 +54</option>
                          <option value="51">🇵🇪 +51</option>
                        </select>
                        <input
                          type="text"
                          required
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          placeholder="71239874"
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1">Rol</label>
                        <select
                          value={manualRole}
                          onChange={(e: any) => setManualRole(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/10 rounded-xl text-white"
                        >
                          <option value="vendedor">Vendedor</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1">Estado Inicial</label>
                        <select
                          value={manualStatus}
                          onChange={(e: any) => setManualStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/10 rounded-xl text-white"
                        >
                          <option value="autorizado">Autorizado</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="suspendido">Suspendido</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1">Notas Administrativas</label>
                      <input
                        type="text"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="Observación o asignación especial..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                      >
                        Guardar Miembro
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewMemberModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CATÁLOGO & COMBOS (EDICIÓN COMPLETA Y POR ENLACE) */}
        {/* ========================================================= */}
        {activeTab === "catalogo" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-black text-xl text-white">
                  Catálogo Oficial, Precios & Combos
                </h3>
                <p className="text-xs text-slate-400">
                  Edición de productos individuales, combos empresariales, precios promocionales y carga mediante enlace.
                </p>
              </div>

              {/* Subtabs and Add by Link Button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1 bg-[#13072b] border border-purple-500/20 rounded-2xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCatalogSubTab("productos")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      catalogSubTab === "productos"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Productos ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogSubTab("combos")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      catalogSubTab === "combos"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Combos ({combosList.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddByLinkOpen(true)}
                  className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Agregar por Enlace</span>
                </button>
              </div>
            </div>

            {/* PRODUCTOS SUB-TAB */}
            {catalogSubTab === "productos" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Manual Add Form */}
                <div className="lg:col-span-5 p-6 rounded-3xl bg-[#13072b] border border-purple-500/20 space-y-4">
                  <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Agregar Nuevo Producto Manual</span>
                  </h4>
                  <form onSubmit={handleCreateProduct} className="space-y-3 text-xs sm:text-sm">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Comercial *</label>
                      <input
                        type="text"
                        required
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Ej. Spirulina Andina Bioactiva"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Precio Normal (Bs) *</label>
                        <input
                          type="number"
                          required
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          placeholder="Ej. 340"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Precio Socio 40% (Bs)</label>
                        <input
                          type="number"
                          value={newProductMemberPrice}
                          onChange={(e) => setNewProductMemberPrice(e.target.value)}
                          placeholder="Ej. 204"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                      <select
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#1b0c38] border border-white/15 rounded-xl text-white"
                      >
                        <option>Nutrición Celular</option>
                        <option>Digestión & Detox</option>
                        <option>Inmunidad & Defensas</option>
                        <option>Energía & Foco</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">URL de Imagen</label>
                      <input
                        type="text"
                        value={newProductImg}
                        onChange={(e) => setNewProductImg(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción Breve</label>
                      <textarea
                        rows={3}
                        value={newProductDesc}
                        onChange={(e) => setNewProductDesc(e.target.value)}
                        placeholder="Propiedades, beneficios e ingredientes bioactivos..."
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-101 transition-transform cursor-pointer"
                    >
                      Guardar en Catálogo Oficial
                    </button>
                  </form>
                </div>

                {/* Products List with Edit Buttons */}
                <div className="lg:col-span-7 space-y-3">
                  <h4 className="font-display font-bold text-base text-white mb-2">
                    Productos Registrados ({products.length})
                  </h4>
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-[#13072b] border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.img}
                          alt={p.name}
                          className="w-14 h-14 object-contain rounded-xl bg-black/40 p-1 border border-white/10 shrink-0"
                        />
                        <div>
                          <h5 className="font-bold text-sm text-white line-clamp-1">{p.name}</h5>
                          <div className="text-xs space-x-2 mt-0.5">
                            <span className="font-mono font-bold text-amber-400">Regular: Bs {p.normalPrice}</span>
                            {p.memberPrice && (
                              <span className="font-mono font-bold text-emerald-400">Socio: Bs {p.memberPrice}</span>
                            )}
                            {p.promoPrice && (
                              <span className="font-mono font-bold text-cyan-300">Promo: Bs {p.promoPrice}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Categoría: {p.category || "Nutrición"} · Estado:{" "}
                            <span className="text-purple-300 font-bold">{p.status || "publicado"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMBOS SUB-TAB */}
            {catalogSubTab === "combos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-base text-white">
                    Combos Empresariales & Kit de Bienvenida ({combosList.length})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Modificación de precios, componentes y márgenes de ganancia
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {combosList.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={c.img}
                              alt={c.name}
                              className="w-14 h-14 object-contain rounded-xl bg-black/40 p-1 border border-white/10 shrink-0"
                            />
                            <div>
                              <h5 className="font-bold text-sm text-white line-clamp-1">{c.name}</h5>
                              <div className="text-xs text-amber-400 font-mono font-bold">
                                Inversión: Bs {c.comboPrice}{" "}
                                {c.promoPrice ? `(Promo: Bs ${c.promoPrice})` : ""}
                              </div>
                              <span className="text-[11px] text-cyan-300 font-bold">
                                {c.profitPercentage
                                  ? `${c.profitPercentage}% Ganancia`
                                  : "Kit 40% OFF Vitalicio"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenEditCombo(c)}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{c.desc}</p>

                        {/* Included components summary */}
                        <div className="p-3 bg-black/30 rounded-2xl border border-white/5 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Componentes incluidos ({c.includedProducts?.length || 0}):
                          </span>
                          <ul className="text-[11px] text-slate-300 space-y-0.5">
                            {c.includedProducts?.slice(0, 3).map((prod, idx) => (
                              <li key={idx} className="line-clamp-1">• {prod}</li>
                            ))}
                            {(c.includedProducts?.length || 0) > 3 && (
                              <li className="text-[10px] text-purple-300 italic">
                                + {(c.includedProducts?.length || 0) - 3} producto(s) más...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <span>ID: <code className="text-slate-300 font-mono">{c.id}</code></span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 uppercase">
                          {c.status || "publicado"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODAL: EDIT PRODUCT */}
            {editingProduct && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-2xl my-6 p-6 sm:p-7 rounded-3xl bg-[#14062f] border border-purple-500/30 shadow-2xl space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white">
                          Editar Producto: {editingProduct.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">ID del documento: {editingProduct.id}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEditProduct}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditProduct} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Nombre del Producto *</label>
                      <input
                        type="text"
                        required
                        value={editProdName}
                        onChange={(e) => setEditProdName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Precio Normal (Bs) *</label>
                        <input
                          type="number"
                          required
                          value={editProdNormalPrice}
                          onChange={(e) => setEditProdNormalPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Precio Socio (Bs)</label>
                        <input
                          type="number"
                          value={editProdMemberPrice}
                          onChange={(e) => setEditProdMemberPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Precio Promocional (Bs)</label>
                        <input
                          type="number"
                          value={editProdPromoPrice}
                          onChange={(e) => setEditProdPromoPrice(e.target.value)}
                          placeholder="Opcional"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Categoría</label>
                        <select
                          value={editProdCategory}
                          onChange={(e) => setEditProdCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/15 rounded-xl text-white"
                        >
                          <option>Nutrición Celular</option>
                          <option>Digestión & Detox</option>
                          <option>Inmunidad & Defensas</option>
                          <option>Energía & Foco</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Estado de Publicación</label>
                        <select
                          value={editProdStatus}
                          onChange={(e: any) => setEditProdStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/15 rounded-xl text-white"
                        >
                          <option value="publicado">Publicado (Visible en vitrina)</option>
                          <option value="oculto">Oculto (Sólo enlace directo)</option>
                          <option value="desactivado">Desactivado</option>
                        </select>
                      </div>
                    </div>

                    {/* Image URL with live preview */}
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">URL de Imagen Principal</label>
                      <div className="flex gap-3 items-center">
                        <img
                          src={editProdImg || "/assets/aistudio/colageno_f2bee034.jpeg"}
                          alt="Preview"
                          className="w-12 h-12 rounded-xl object-contain bg-black/40 p-1 border border-white/15 shrink-0"
                        />
                        <input
                          type="text"
                          value={editProdImg}
                          onChange={(e) => setEditProdImg(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Enlace del Producto (URL o slug)</label>
                        <input
                          type="text"
                          value={editProdUrl}
                          onChange={(e) => setEditProdUrl(e.target.value)}
                          placeholder="/tl-colageno o https://..."
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Enlace de Compra o Landing</label>
                        <input
                          type="text"
                          value={editProdCheckoutUrl}
                          onChange={(e) => setEditProdCheckoutUrl(e.target.value)}
                          placeholder="https://... o vacío"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Descripción Corta</label>
                      <textarea
                        rows={2}
                        value={editProdDesc}
                        onChange={(e) => setEditProdDesc(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Descripción Completa</label>
                      <textarea
                        rows={3}
                        value={editProdLongDesc}
                        onChange={(e) => setEditProdLongDesc(e.target.value)}
                        placeholder="Propiedades clínicas, beneficios y absorción..."
                        className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Ingredientes (separados por coma)</label>
                        <input
                          type="text"
                          value={editProdIngredients}
                          onChange={(e) => setEditProdIngredients(e.target.value)}
                          placeholder="Colágeno Marino, Ácido Hialurónico, CoQ10..."
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Presentación Comercial</label>
                        <input
                          type="text"
                          value={editProdPresentation}
                          onChange={(e) => setEditProdPresentation(e.target.value)}
                          placeholder="Caja de 30 sobres de 10g..."
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={isSavingProduct}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-101 transition-transform cursor-pointer disabled:opacity-50"
                      >
                        {isSavingProduct ? "Guardando..." : "Guardar Cambios en Firestore"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditProduct}
                        className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL: EDIT COMBO */}
            {editingCombo && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-2xl my-6 p-6 sm:p-7 rounded-3xl bg-[#14062f] border border-purple-500/30 shadow-2xl space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white">
                          Editar Combo: {editingCombo.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">ID: {editingCombo.id}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEditCombo}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditCombo} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Nombre del Combo *</label>
                      <input
                        type="text"
                        required
                        value={editComboName}
                        onChange={(e) => setEditComboName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Precio Total (Bs) *</label>
                        <input
                          type="number"
                          required
                          value={editComboPrice}
                          onChange={(e) => setEditComboPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Porcentaje de Ganancia (%)</label>
                        <input
                          type="number"
                          value={editComboProfitPercentage}
                          onChange={(e) => setEditComboProfitPercentage(e.target.value)}
                          placeholder="Ej. 60 o 87"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Volumen Comisionable (Bs)</label>
                        <input
                          type="number"
                          value={editComboCommissionable}
                          onChange={(e) => setEditComboCommissionable(e.target.value)}
                          placeholder="Ej. 1125"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">URL de Imagen</label>
                        <div className="flex gap-2 items-center">
                          <img
                            src={editComboImg || "/assets/aistudio/kit-basico_6d3d0c57.jpeg"}
                            alt="Preview"
                            className="w-10 h-10 rounded-lg object-contain bg-black/40 p-1 border border-white/10 shrink-0"
                          />
                          <input
                            type="text"
                            value={editComboImg}
                            onChange={(e) => setEditComboImg(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Estado</label>
                        <select
                          value={editComboStatus}
                          onChange={(e: any) => setEditComboStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/15 rounded-xl text-white"
                        >
                          <option value="publicado">Publicado</option>
                          <option value="oculto">Oculto</option>
                          <option value="desactivado">Desactivado</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Descripción Comercial</label>
                      <textarea
                        rows={2}
                        value={editComboDesc}
                        onChange={(e) => setEditComboDesc(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white leading-relaxed"
                      />
                    </div>

                    {/* Component list modifier */}
                    <div className="space-y-2 p-3 bg-black/25 rounded-2xl border border-white/10">
                      <label className="block text-slate-300 font-semibold">
                        Productos y Componentes Incluidos ({editComboIncludedProducts.length}):
                      </label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {editComboIncludedProducts.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-xs"
                          >
                            <span className="text-white line-clamp-1">• {item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveComboComponent(idx)}
                              className="text-rose-400 hover:text-rose-300 p-1"
                              title="Retirar componente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={editComboNewComponent}
                          onChange={(e) => setEditComboNewComponent(e.target.value)}
                          placeholder="Añadir componente (ej. 2x Colágeno Marino 10g)..."
                          className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddComboComponent}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={isSavingCombo}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-101 transition-transform cursor-pointer disabled:opacity-50"
                      >
                        {isSavingCombo ? "Guardando..." : "Guardar Cambios del Combo"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditCombo}
                        className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL: ADD PRODUCT BY LINK */}
            {isAddByLinkOpen && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-lg my-6 p-6 sm:p-7 rounded-3xl bg-[#14062f] border border-cyan-500/30 shadow-2xl space-y-4 text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white">
                          Agregar Producto Mediante Enlace
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Recuperación de metadatos con protección SSRF y validación
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddByLinkOpen(false);
                        setExtractedPreview(null);
                        setLinkInputUrl("");
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!extractedPreview ? (
                    <form onSubmit={handleAnalyzeLink} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">
                          URL de la Página del Producto (HTTP o HTTPS) *
                        </label>
                        <input
                          type="url"
                          required
                          value={linkInputUrl}
                          onChange={(e) => setLinkInputUrl(e.target.value)}
                          placeholder="https://ejemplo.com/producto-salud-celular"
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Solo se aceptan URLs públicas seguras. Se bloquean direcciones locales (protección SSRF).
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isExtractingLink || !linkInputUrl.trim()}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 font-bold text-white shadow-lg shadow-cyan-600/30 hover:scale-101 transition-transform cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isExtractingLink ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Analizando enlace y recuperando datos...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Analizar Enlace</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Preview Form to Verify & Confirm */
                    <form onSubmit={handleConfirmAddByLink} className="space-y-3.5 text-xs">
                      {linkExtractionNotice && (
                        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-[11px] leading-relaxed">
                          {linkExtractionNotice}
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Nombre del Producto *</label>
                        <input
                          type="text"
                          required
                          value={extractedPreview.name}
                          onChange={(e) =>
                            setExtractedPreview({ ...extractedPreview, name: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">Precio Normal (Bs) *</label>
                          <input
                            type="number"
                            required
                            value={extractedPreview.normalPrice}
                            onChange={(e) =>
                              setExtractedPreview({ ...extractedPreview, normalPrice: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">Precio Socio 40% (Bs)</label>
                          <input
                            type="number"
                            value={extractedPreview.memberPrice}
                            onChange={(e) =>
                              setExtractedPreview({ ...extractedPreview, memberPrice: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Categoría</label>
                        <select
                          value={extractedPreview.category}
                          onChange={(e) =>
                            setExtractedPreview({ ...extractedPreview, category: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-[#1b0840] border border-white/15 rounded-xl text-white"
                        >
                          <option>Nutrición Celular</option>
                          <option>Digestión & Detox</option>
                          <option>Inmunidad & Defensas</option>
                          <option>Energía & Foco</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">URL de Imagen</label>
                        <div className="flex gap-2 items-center">
                          <img
                            src={extractedPreview.img}
                            alt="Preview"
                            className="w-10 h-10 rounded-lg object-contain bg-black/40 p-1 border border-white/10 shrink-0"
                          />
                          <input
                            type="text"
                            value={extractedPreview.img}
                            onChange={(e) =>
                              setExtractedPreview({ ...extractedPreview, img: e.target.value })
                            }
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Descripción Extraída</label>
                        <textarea
                          rows={2}
                          value={extractedPreview.desc}
                          onChange={(e) =>
                            setExtractedPreview({ ...extractedPreview, desc: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white leading-relaxed"
                        />
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 font-bold text-white shadow-lg shadow-cyan-600/30 hover:scale-101 transition-transform cursor-pointer"
                        >
                          Confirmar y Guardar en Firestore
                        </button>
                        <button
                          type="button"
                          onClick={() => setExtractedPreview(null)}
                          className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                        >
                          Volver
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DESPACHO DE PEDIDOS */}
        {/* ========================================================= */}
        {activeTab === "pedidos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Todos los Pedidos Recibidos</h3>
                <p className="text-xs text-slate-400">
                  Integridad garantizada: las modificaciones de precios en el catálogo no alteran los pedidos pasados.
                </p>
              </div>
              <span className="text-xs text-slate-400">Total: {orders.length} pedidos</span>
            </div>

            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="p-5 rounded-3xl bg-[#13072b] border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-base text-white">{o.clienteNombre}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          o.estado === "confirmado"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : o.estado === "entregado"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {o.estado}
                      </span>
                      {o.vendedorId && (
                        <span className="text-[10px] text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                          Ref: {o.vendedorId}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300">
                      WhatsApp: <span className="font-mono text-purple-200">+{o.clienteCelular}</span> · Destino:{" "}
                      <span className="text-amber-300">{o.departamento}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Items: {o.productos?.map((p) => `${p.nombre} (x${p.cantidad})`).join(", ")}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right mr-2">
                      <div className="text-[10px] text-slate-400 uppercase">Total Pedido</div>
                      <div className="font-display font-black text-xl text-amber-400">Bs {o.total.toFixed(0)}</div>
                    </div>

                    {o.estado !== "confirmado" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(o.id!, "confirmado")}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Confirmar
                      </button>
                    )}
                    {o.estado !== "entregado" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(o.id!, "entregado")}
                        className="px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Entregado
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CENTRO DE CONOCIMIENTO IA */}
        {/* ========================================================= */}
        {activeTab === "ia" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-black text-xl text-white">
                Centro de Conocimiento de la Inteligencia Artificial
              </h3>
              <p className="text-xs text-slate-400">
                Alimenta y audita el cerebro de la asesora virtual para que responda con exactitud clínica, comercial y fiscal sin inventar precios.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 p-6 rounded-3xl bg-[#13072b] border border-purple-500/20 space-y-4">
                <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>{editingKnowledgeId ? "Editar Artículo de Conocimiento" : "Nuevo Artículo de Conocimiento"}</span>
                </h4>

                <form onSubmit={handleSaveKnowledge} className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Título del Artículo *</label>
                    <input
                      type="text"
                      required
                      value={knowledgeTitle}
                      onChange={(e) => setKnowledgeTitle(e.target.value)}
                      placeholder="Ej. Protocolo de toma de Coffee Life y Cordyceps"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                      <select
                        value={knowledgeCategory}
                        onChange={(e: any) => setKnowledgeCategory(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#1b0840] border border-white/15 rounded-xl text-white text-xs"
                      >
                        <option value="productos">Productos</option>
                        <option value="negocio">Negocio & Comisiones</option>
                        <option value="legalidad">Legalidad & NIT</option>
                        <option value="protocolos">Protocolos de Salud</option>
                        <option value="faq">Preguntas Frecuentes</option>
                        <option value="general">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Estado</label>
                      <select
                        value={knowledgeStatus}
                        onChange={(e: any) => setKnowledgeStatus(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#1b0840] border border-white/15 rounded-xl text-white text-xs"
                      >
                        <option value="publicado">Publicado (Activo en IA)</option>
                        <option value="borrador">Borrador (Oculto)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Contenido / Información Verificada para la IA *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={knowledgeContent}
                      onChange={(e) => setKnowledgeContent(e.target.value)}
                      placeholder="Redacta la información exacta, ingredientes, precios, modo de uso o respuesta que la IA debe comunicar a los clientes..."
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-xs leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 font-bold text-white shadow-lg shadow-cyan-600/30 hover:scale-101 transition-transform cursor-pointer"
                    >
                      {editingKnowledgeId ? "Actualizar Conocimiento" : "Publicar en la IA"}
                    </button>
                    {editingKnowledgeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKnowledgeId(null);
                          setKnowledgeTitle("");
                          setKnowledgeContent("");
                        }}
                        className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                {/* Interactive Testing Simulator */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                    <Bot className="w-4 h-4" />
                    <span>Probador Interactivo en Vivo de la IA</span>
                  </div>
                  <form onSubmit={handleTestAi} className="flex gap-2">
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      placeholder="Haz una pregunta de prueba a la IA..."
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Probar</span>
                    </button>
                  </form>

                  {testResponse && (
                    <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-500/30 text-xs space-y-2">
                      <div className="font-bold text-cyan-300 text-[11px]">Respuesta generada por la IA:</div>
                      <p className="text-slate-200 whitespace-pre-line leading-relaxed">{testResponse}</p>
                      {testRecommendedProduct && (
                        <div className="text-[10px] text-amber-300">
                          Recomendación automática: <strong>{testRecommendedProduct}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <h4 className="font-display font-bold text-base text-white">
                  Base de Datos Indexada ({knowledgeList.length})
                </h4>
                {knowledgeList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#13072b] border border-purple-500/20 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-sm text-white">{item.title}</h5>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            item.status === "publicado"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {item.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditKnowledge(item)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKnowledge(item)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{item.content}</p>
                    <div className="text-[10px] text-slate-400 capitalize">Categoría: {item.category}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: HISTORIAL DE ACTIVIDADES (AUDITORÍA) */}
        {/* ========================================================= */}
        {activeTab === "actividades" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">Historial de Auditoría & Bitácora</h3>
                <p className="text-xs text-slate-400">
                  Registro cronológico de modificaciones en catálogo, miembros, combos, configuración y pedidos.
                </p>
              </div>
              <span className="text-xs text-slate-400">Eventos: {auditLogs.length}</span>
            </div>

            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center bg-[#13072b] rounded-3xl border border-white/10 text-slate-400 text-xs">
                  Aún no hay actividades registradas en la bitácora.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-[#13072b] border border-purple-500/20 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{log.action}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {log.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{log.details}</p>
                      <div className="text-[10px] text-slate-400">
                        Ejecutado por: <span className="text-amber-300">{log.user}</span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {log.timestamp instanceof Date
                        ? log.timestamp.toLocaleString("es-BO")
                        : "Reciente"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: CONFIGURACIÓN DEL SISTEMA (MODIFICABLE) */}
        {/* ========================================================= */}
        {activeTab === "configuracion" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-black text-xl text-white">Configuración del Sistema</h3>
                <p className="text-xs text-slate-400">
                  Parámetros legales, fiscales y comerciales oficiales de Team Life Company S.R.L.
                </p>
              </div>

              {!isEditingCompanyConfig ? (
                <button
                  type="button"
                  onClick={() => setIsEditingCompanyConfig(true)}
                  className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Configuración</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingCompanyConfig(false)}
                  className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs cursor-pointer self-start sm:self-auto"
                >
                  Cancelar Edición
                </button>
              )}
            </div>

            {isEditingCompanyConfig ? (
              <form onSubmit={handleSaveCompanyConfig} className="p-6 rounded-3xl bg-[#13072b] border border-purple-500/30 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Razón Social Oficial *</label>
                    <input
                      type="text"
                      required
                      value={cfgName}
                      onChange={(e) => setCfgName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Nombre Comercial</label>
                    <input
                      type="text"
                      value={cfgCommercialName}
                      onChange={(e) => setCfgCommercialName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">NIT (Impuestos Nacionales) *</label>
                    <input
                      type="text"
                      required
                      value={cfgNit}
                      onChange={(e) => setCfgNit(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">WhatsApp Central de Despachos *</label>
                    <input
                      type="text"
                      required
                      value={cfgDefaultWhatsapp}
                      onChange={(e) => setCfgDefaultWhatsapp(e.target.value)}
                      placeholder="59178945612"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Registro Sanitario SENASAG</label>
                    <input
                      type="text"
                      value={cfgSenasag}
                      onChange={(e) => setCfgSenasag(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Matrícula SEPREC</label>
                    <input
                      type="text"
                      value={cfgSeprec}
                      onChange={(e) => setCfgSeprec(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Fundadores Oficiales</label>
                  <input
                    type="text"
                    value={cfgFounders}
                    onChange={(e) => setCfgFounders(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Perfil de los Fundadores</label>
                  <textarea
                    rows={3}
                    value={cfgFoundersProfile}
                    onChange={(e) => setCfgFoundersProfile(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Misión Institucional</label>
                    <textarea
                      rows={2}
                      value={cfgMission}
                      onChange={(e) => setCfgMission(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Visión Institucional</label>
                    <textarea
                      rows={2}
                      value={cfgVision}
                      onChange={(e) => setCfgVision(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 font-bold text-white shadow-lg shadow-purple-600/30 hover:scale-101 transition-transform cursor-pointer disabled:opacity-50"
                  >
                    {isSavingConfig ? "Guardando en Firestore..." : "Guardar Configuración en Firestore"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCompanyConfig(false)}
                    className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Legal Info Card */}
                <div className="p-6 rounded-3xl bg-[#13072b] border border-purple-500/20 space-y-4">
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <span>Respaldo Legal y Fiscal</span>
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-0.5">Razón Social Oficial:</label>
                      <div className="font-bold text-white">{cfgName} ({cfgCommercialName})</div>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-0.5">Número de Identificación Tributaria (NIT):</label>
                      <div className="font-mono font-bold text-amber-400">{cfgNit} (Régimen General)</div>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-0.5">Registro Sanitario SENASAG:</label>
                      <div className="text-white">{cfgSenasag}</div>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-0.5">Registro SEPREC Bolivia:</label>
                      <div className="text-white">{cfgSeprec}</div>
                    </div>
                  </div>
                </div>

                {/* Operational & Founders */}
                <div className="p-6 rounded-3xl bg-[#13072b] border border-purple-500/20 space-y-4">
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-cyan-400" />
                    <span>Operaciones Centrales</span>
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-0.5">Fundadores Oficiales:</label>
                      <div className="font-bold text-white">{cfgFounders}</div>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-0.5">WhatsApp Central de Despachos:</label>
                      <div className="font-mono font-bold text-emerald-400">+{cfgDefaultWhatsapp}</div>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-0.5">Alcance Operativo:</label>
                      <div className="text-white">Despachos a los 9 departamentos de Bolivia en 24 horas</div>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-0.5">Superadministrador de la Plataforma:</label>
                      <div className="text-purple-300 font-bold">Un solo administrador central con acceso total</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
