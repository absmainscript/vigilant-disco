
import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, Edit, Trash2, Plus, Star, GripVertical, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Testimonial } from "@shared/schema";
import { TestimonialImageUpload } from "./TestimonialImageUpload";
import { Avatar } from "@/components/Avatar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const testimonialSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  service: z.string().min(1, "Serviço é obrigatório"),
  testimonial: z.string().min(1, "Depoimento é obrigatório"),
  rating: z.number().min(1).max(5),
  isActive: z.boolean(),
});

type TestimonialForm = z.infer<typeof testimonialSchema>;

interface SortableTestimonialProps {
  testimonial: Testimonial;
  onEdit: (testimonial: Testimonial) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}

function SortableTestimonial({ testimonial, onEdit, onToggleActive, onDelete }: SortableTestimonialProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: testimonial.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-200 ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-gray-200 transition-colors touch-manipulation"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="w-12">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {testimonial.photo ? (
            <img 
              src={testimonial.photo} 
              alt={`Foto de ${testimonial.name}`} 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src="/src/assets/testimonial-placeholder.svg" 
              alt="Avatar placeholder" 
              className="w-6 h-6 opacity-60"
            />
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div>
          <div className="font-semibold text-gray-900">{testimonial.name}</div>
          <div className="text-sm text-gray-500">{testimonial.service}</div>
        </div>
      </TableCell>
      <TableCell className="max-w-md">
        <div className="text-sm text-gray-700 line-clamp-2">
          {testimonial.testimonial}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < testimonial.rating 
                  ? 'text-yellow-400 fill-current' 
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="ml-1 text-sm text-gray-600">({testimonial.rating})</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant={testimonial.isActive ? "default" : "secondary"}
          className={testimonial.isActive ? "bg-green-100 text-green-800" : ""}
        >
          {testimonial.isActive ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleActive(testimonial.id, !testimonial.isActive)}
            className="h-8 w-8 p-0"
          >
            {testimonial.isActive ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(testimonial)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(testimonial.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TestimonialsManager({ testimonials = [] }: { testimonials: Testimonial[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [localTestimonials, setLocalTestimonials] = useState<Testimonial[]>(testimonials);
  const [uploadedImage, setUploadedImage] = useState<string>("");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Sistema de inicialização inteligente para evitar recarregamentos
  React.useEffect(() => {
    if (!hasInitialized && testimonials.length > 0) {
      setLocalTestimonials(testimonials);
      setHasInitialized(true);
    } else if (!hasInitialized && testimonials.length === 0) {
      // Marca como inicializado mesmo sem dados para evitar atualizações futuras
      setHasInitialized(true);
    }
  }, [testimonials, hasInitialized]);

  // Sincroniza apenas novos itens sem perturbar estado existente
  React.useEffect(() => {
    if (hasInitialized && testimonials.length > localTestimonials.length) {
      const newItems = testimonials.filter(t => 
        !localTestimonials.some(local => local.id === t.id)
      );
      if (newItems.length > 0) {
        setLocalTestimonials(prev => [...prev, ...newItems]);
      }
    }
  }, [testimonials, localTestimonials, hasInitialized]);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<TestimonialForm>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      name: "",
      service: "",
      testimonial: "",
      rating: 5,
      isActive: true,
    },
  });

  // Mutation para criar
  const createMutation = useMutation({
    mutationFn: async (data: TestimonialForm & { photo?: string }) => {
      const response = await apiRequest("POST", "/api/admin/testimonials", data);
      return response.json();
    },
    onSuccess: (newTestimonial) => {
      // Atualiza dados locais imediatamente SEM afetar estado de edição
      setLocalTestimonials(prev => [...prev, newTestimonial]);
      
      // Atualiza cache silenciosamente para sincronizar dados
      queryClient.setQueryData(["/api/admin/testimonials"], (old: Testimonial[] = []) => {
        return [...old, newTestimonial];
      });
      
      toast({ title: "Depoimento criado com sucesso!" });
      
      // Fecha o diálogo suavemente
      setIsDialogOpen(false);
      form.reset({
        name: "",
        service: "",
        testimonial: "",
        rating: 5,
        isActive: true,
      });
      setEditingTestimonial(null);
      setUploadedImage("");
    },
    onError: () => {
      toast({ title: "Erro ao criar depoimento", variant: "destructive" });
    }
  });

  // Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TestimonialForm & { photo?: string } }) => {
      const response = await apiRequest("PUT", `/api/admin/testimonials/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedTestimonial) => {
      // Atualiza dados locais PRESERVANDO estado de edição
      setLocalTestimonials(prev => 
        prev.map(t => t.id === updatedTestimonial.id ? updatedTestimonial : t)
      );
      
      // Atualiza cache silenciosamente
      queryClient.setQueryData(["/api/admin/testimonials"], (old: Testimonial[] = []) => {
        return old.map(t => t.id === updatedTestimonial.id ? updatedTestimonial : t);
      });
      
      toast({ title: "Depoimento atualizado com sucesso!" });
      
      // Fecha apenas este diálogo, mantém outros estados intactos
      setIsDialogOpen(false);
      form.reset({
        name: "",
        service: "",
        testimonial: "",
        rating: 5,
        isActive: true,
      });
      setEditingTestimonial(null);
      setUploadedImage("");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar depoimento", variant: "destructive" });
    }
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/testimonials/${id}`);
      return response.json();
    },
    onSuccess: (_, deletedId) => {
      // Remove dos dados locais sem afetar componentes em edição
      setLocalTestimonials(prev => prev.filter(t => t.id !== deletedId));
      
      // Atualiza cache silenciosamente
      queryClient.setQueryData(["/api/admin/testimonials"], (old: Testimonial[] = []) => {
        return old.filter(t => t.id !== deletedId);
      });
      
      toast({ title: "Depoimento removido com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover depoimento", variant: "destructive" });
    }
  });

  // Mutation para reordenar
  const reorderMutation = useMutation({
    mutationFn: async (reorderedTestimonials: Testimonial[]) => {
      const response = await apiRequest("PUT", "/api/admin/testimonials/reorder", {
        testimonials: reorderedTestimonials.map((t, index) => ({
          id: t.id,
          order: index
        }))
      });
      return response.json();
    },
    onSuccess: (reorderedData) => {
      // Sincroniza silenciosamente sem perturbar estado de edição
      queryClient.setQueryData(["/api/admin/testimonials"], reorderedData);
      toast({ title: "Ordem atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar ordem", variant: "destructive" });
      // Reverte dados locais em caso de erro
      setLocalTestimonials(testimonials);
    }
  });

  const resetForm = () => {
    form.reset({
      name: "",
      service: "",
      testimonial: "",
      rating: 5,
      isActive: true,
    });
    setEditingTestimonial(null);
    setUploadedImage("");
    setIsDialogOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    // Controle inteligente de abertura/fechamento do diálogo
    if (!open) {
      // Confirma o fechamento se estiver editando e há mudanças não salvas
      if (editingTestimonial && form.formState.isDirty && !isLoading) {
        const confirmClose = confirm(
          "Tem certeza que deseja sair? As alterações não salvas serão perdidas."
        );
        if (!confirmClose) {
          return; // Não fecha o diálogo
        }
      }
      
      // Reset suave sem afetar outros componentes
      form.reset({
        name: "",
        service: "",
        testimonial: "",
        rating: 5,
        isActive: true,
      });
      setEditingTestimonial(null);
      setUploadedImage("");
    }
    
    setIsDialogOpen(open);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    // Verifica se outro diálogo já está aberto com mudanças não salvas
    if (isDialogOpen && form.formState.isDirty && !isLoading) {
      const confirmSwitch = confirm(
        "Tem certeza que deseja editar outro depoimento? As alterações atuais serão perdidas."
      );
      if (!confirmSwitch) {
        return; // Não abre novo diálogo
      }
    }
    
    // Configura dados do depoimento a ser editado sem afetar outros componentes
    setEditingTestimonial(testimonial);
    form.reset({
      name: testimonial.name,
      service: testimonial.service,
      testimonial: testimonial.testimonial,
      rating: testimonial.rating,
      isActive: testimonial.isActive,
    });
    setUploadedImage(testimonial.photo || "");
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TestimonialForm) => {
    const testimonialData = {
      ...data,
      photo: uploadedImage,
    };

    if (editingTestimonial) {
      updateMutation.mutate({ id: editingTestimonial.id, data: testimonialData });
    } else {
      createMutation.mutate(testimonialData);
    }
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    const testimonial = localTestimonials.find(t => t.id === id);
    if (!testimonial) return;

    // Atualiza estado local imediatamente para resposta instantânea
    setLocalTestimonials(prev => 
      prev.map(t => t.id === id ? { ...t, isActive } : t)
    );

    updateMutation.mutate({
      id,
      data: {
        name: testimonial.name,
        service: testimonial.service,
        testimonial: testimonial.testimonial,
        rating: testimonial.rating,
        isActive,
        photo: testimonial.photo,
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este depoimento?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (active.id !== over?.id) {
      const oldIndex = localTestimonials.findIndex(t => t.id.toString() === active.id);
      const newIndex = localTestimonials.findIndex(t => t.id.toString() === over?.id);

      const reordered = arrayMove(localTestimonials, oldIndex, newIndex);
      setLocalTestimonials(reordered);
      reorderMutation.mutate(reordered);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || reorderMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Depoimentos ({localTestimonials.filter(t => t.isActive).length} ativos)
          </h3>
          <p className="text-sm text-gray-600">
            Gerencie os depoimentos dos seus pacientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-purple-600 to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Depoimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTestimonial ? "Editar Depoimento" : "Adicionar Depoimento"}
              </DialogTitle>
              <DialogDescription>
                {editingTestimonial 
                  ? "Edite as informações do depoimento" 
                  : "Adicione um novo depoimento de paciente"
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TestimonialImageUpload
                  value={uploadedImage}
                  onChange={setUploadedImage}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Paciente</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Maria Silva" 
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Serviço</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Terapia Individual" 
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="testimonial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depoimento</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite o depoimento do paciente..."
                          className="min-h-24 resize-y"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avaliação (1-5 estrelas)</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <SelectItem key={rating} value={rating.toString()}>
                                  <div className="flex items-center gap-2">
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-4 h-4 ${
                                            i < rating 
                                              ? 'text-yellow-400 fill-current' 
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span>({rating} estrela{rating !== 1 ? 's' : ''})</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-end">
                        <FormLabel>Status</FormLabel>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                          <FormLabel className="text-sm">
                            {field.value ? "Ativo" : "Inativo"}
                          </FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleDialogOpenChange(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                    disabled={isLoading}
                  >
                    {isLoading ? "Salvando..." : editingTestimonial ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {localTestimonials.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Star className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum depoimento ainda
            </h3>
            <p className="text-gray-500 mb-4">
              Adicione depoimentos dos seus pacientes para construir credibilidade
            </p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Depoimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={localTestimonials.map(t => t.id.toString())}
                strategy={verticalListSortingStrategy}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Nome / Serviço</TableHead>
                      <TableHead>Depoimento</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localTestimonials.map((testimonial) => (
                      <SortableTestimonial
                        key={testimonial.id}
                        testimonial={testimonial}
                        onEdit={openEditDialog}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
