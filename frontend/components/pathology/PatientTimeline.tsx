"use client";

import React, { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Pill,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StaticScrollArea } from "@/components/ui/scrollArea";

// Timeline event types
export type TimelineEventType =
  | "diagnosis"
  | "examination"
  | "treatment"
  | "medication"
  | "followup"
  | "other";

// Timeline event interface
export interface TimelineEvent {
  id: string;
  date: string; // ISO date string
  type: TimelineEventType;
  title: string;
  description: string;
  images?: string[]; // Pathology image URLs
  attachments?: string[];
}

// Icon mapping for event types
const eventTypeIcons: Record<TimelineEventType, React.ReactNode> = {
  diagnosis: <Activity className="h-5 w-5" />,
  examination: <FileText className="h-5 w-5" />,
  treatment: <Activity className="h-5 w-5" />,
  medication: <Pill className="h-5 w-5" />,
  followup: <Calendar className="h-5 w-5" />,
  other: <FileText className="h-5 w-5" />,
};

// Color mapping for event types
const eventTypeColors: Record<TimelineEventType, string> = {
  diagnosis: "bg-red-500",
  examination: "bg-blue-500",
  treatment: "bg-green-500",
  medication: "bg-purple-500",
  followup: "bg-orange-500",
  other: "bg-gray-500",
};

interface PatientTimelineProps {
  patientId?: string;
  patientName?: string;
  events: TimelineEvent[];
  onAddEvent?: (event: Omit<TimelineEvent, "id">) => void;
  onEditEvent?: (id: string, event: Partial<TimelineEvent>) => void;
  onDeleteEvent?: (id: string) => void;
  editable?: boolean;
}

export function PatientTimeline({
  patientId,
  patientName = "Patient",
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  editable = true,
}: PatientTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "diagnosis" as TimelineEventType,
    title: "",
    description: "",
  });

  // Sort events by date (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Toggle event expansion
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Handle form submit
  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingEvent) {
      // Update existing event
      onEditEvent?.(editingEvent.id, formData);
      setEditingEvent(null);
    } else {
      // Add new event
      onAddEvent?.(formData);
    }

    // Reset form
    setFormData({
      date: new Date().toISOString().split("T")[0],
      type: "diagnosis",
      title: "",
      description: "",
    });
    setIsAddDialogOpen(false);
  };

  // Handle edit click
  const handleEditClick = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      date: event.date,
      type: event.type,
      title: event.title,
      description: event.description,
    });
    setIsAddDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (eventId: string) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      onDeleteEvent?.(eventId);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Patient Timeline</h2>
            <p className="text-sm text-gray-600">{patientName}</p>
          </div>
          {editable && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogPrimitive.Trigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogPrimitive.Trigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingEvent ? "Edit Event" : "Add Timeline Event"}
                  </DialogTitle>
                  <DialogDescription>
                    Add a medical event to the patient's timeline.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="date" className="text-sm font-medium">
                      Date
                    </label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="type" className="text-sm font-medium">
                      Event Type
                    </label>
                    <select
                      id="type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as TimelineEventType,
                        })
                      }
                    >
                      <option value="diagnosis">Diagnosis</option>
                      <option value="examination">Examination</option>
                      <option value="treatment">Treatment</option>
                      <option value="medication">Medication</option>
                      <option value="followup">Follow-up</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="title"
                      placeholder="e.g., Initial diagnosis"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      placeholder="Enter detailed description..."
                      rows={4}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingEvent(null);
                      setFormData({
                        date: new Date().toISOString().split("T")[0],
                        type: "diagnosis",
                        title: "",
                        description: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.title.trim()}>
                    {editingEvent ? "Update" : "Add"} Event
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Timeline */}
      <StaticScrollArea className="flex-1 p-4">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-600 mb-2">
              No timeline events yet
            </p>
            <p className="text-sm text-gray-500">
              Add events to track the patient's medical history
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Events */}
            <div className="space-y-6">
              {sortedEvents.map((event, index) => {
                const isExpanded = expandedEvents.has(event.id);
                const Icon = eventTypeIcons[event.type];
                const colorClass = eventTypeColors[event.type];

                return (
                  <div key={event.id} className="relative pl-12">
                    {/* Icon */}
                    <div
                      className={`absolute left-3 top-0 w-6 h-6 rounded-full ${colorClass} flex items-center justify-center text-white z-10`}
                    >
                      {Icon}
                    </div>

                    {/* Event card */}
                    <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => toggleEventExpansion(event.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-500 uppercase">
                                {event.type}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(event.date)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-base mb-1">
                              {event.title}
                            </h3>
                            {!isExpanded && event.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {editable && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(event);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(event.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t">
                          <div className="pt-4">
                            {event.description && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2">
                                  Description
                                </h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {event.description}
                                </p>
                              </div>
                            )}

                            {event.images && event.images.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">
                                  Related Images
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                  {event.images.map((img, idx) => (
                                    <div
                                      key={idx}
                                      className="aspect-square rounded border overflow-hidden bg-gray-100"
                                    >
                                      <img
                                        src={img}
                                        alt={`Related image ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </StaticScrollArea>
    </div>
  );
}
