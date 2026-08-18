"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      richColors
      className="toaster group"
      icons={{
        success: null,
        info: null,
        warning: null,
        error: null,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "hsl(220 27% 10%)",
          "--normal-text": "hsl(210 40% 98%)",
          "--normal-border": "hsl(220 27% 20%)",
          "--success-bg": "hsl(152 55% 16%)",
          "--success-text": "hsl(150 80% 82%)",
          "--success-border": "hsl(152 50% 30%)",
          "--error-bg": "hsl(0 62% 18%)",
          "--error-text": "hsl(0 90% 92%)",
          "--error-border": "hsl(0 55% 36%)",
          "--warning-bg": "hsl(40 70% 16%)",
          "--warning-text": "hsl(46 90% 82%)",
          "--warning-border": "hsl(40 65% 32%)",
          "--info-bg": "hsl(210 60% 16%)",
          "--info-text": "hsl(210 90% 86%)",
          "--info-border": "hsl(210 55% 32%)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!opacity-100 shadow-lg text-xs",
          title: "text-xs font-medium leading-snug",
          icon: "!hidden",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
