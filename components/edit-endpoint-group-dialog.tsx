"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { updateEndpointGroup } from "@/lib/services/endpoint-groups"
import { EndpointGroupWithEndpoints } from "@/types/endpoint-group"
import { Endpoint } from "@/lib/db/schema/endpoints"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

const editEndpointGroupSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
})

type EditEndpointGroupFormValues = z.infer<typeof editEndpointGroupSchema>

interface EditEndpointGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: EndpointGroupWithEndpoints | null
  allEndpoints: Endpoint[]
  onSuccess: () => void
}

export function EditEndpointGroupDialog({
  open,
  onOpenChange,
  group,
  allEndpoints,
  onSuccess
}: EditEndpointGroupDialogProps) {
  const [isPending, setIsPending] = useState(false)
  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>([])
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<EditEndpointGroupFormValues>({
    resolver: zodResolver(editEndpointGroupSchema),
    defaultValues: {
      name: "",
    },
  })

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
      })
      setSelectedEndpoints(group.endpoints || [])
    }
  }, [group, form])

  useEffect(() => {
    if (!open) {
      form.reset()
      setSelectedEndpoints([])
    }
  }, [open, form])

  const toggleEndpointSelection = (endpoint: Endpoint) => {
    setSelectedEndpoints(prev => {
      const isSelected = prev.some(e => e.id === endpoint.id)
      if (isSelected) {
        if (prev.length === 1) {
          toast({
            variant: "destructive",
            description: "至少需要选择一个接口",
          })
          return prev
        }
        return prev.filter(e => e.id !== endpoint.id)
      } else {
        return [...prev, endpoint]
      }
    })
  }

  async function onSubmit(data: EditEndpointGroupFormValues) {
    if (!group) {
      toast({
        variant: "destructive",
        description: "接口组不存在",
      })
      return
    }

    if (selectedEndpoints.length === 0) {
      toast({
        variant: "destructive",
        description: "请至少选择一个接口",
      })
      return
    }

    try {
      setIsPending(true)
      await updateEndpointGroup(group.id, {
        ...data,
        endpointIds: selectedEndpoints.map(e => e.id),
      })
      
      toast({ description: "接口组更新成功" })
      onOpenChange(false)
      onSuccess()
      router.refresh()
    } catch (error) {
      console.error('更新接口组失败:', error)
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "更新接口组失败，请重试"
      })
    } finally {
      setIsPending(false)
    }
  }

  if (!group) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>编辑接口组</DialogTitle>
          <DialogDescription>
            修改接口组的名称和包含的接口
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    接口组名称
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入接口组名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <h3 className="mb-2 text-sm font-medium">选择接口</h3>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2">
                  {allEndpoints.map(endpoint => (
                    <div key={endpoint.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={endpoint.id}
                        checked={selectedEndpoints.some(e => e.id === endpoint.id)}
                        onCheckedChange={() => toggleEndpointSelection(endpoint)}
                      />
                      <label
                        htmlFor={endpoint.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {endpoint.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存更改
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 