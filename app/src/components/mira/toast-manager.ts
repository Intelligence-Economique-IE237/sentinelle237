import { Toast as ToastPrimitive } from "@base-ui/react/toast"

/**
 * Gestionnaire de notifications global.
 * Usage : toast.add({ title, description?, type: "success" | "error" | "info" })
 */
export const toast = ToastPrimitive.createToastManager()
