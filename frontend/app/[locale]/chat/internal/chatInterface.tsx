"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from "react-i18next";

import { ROLE_ASSISTANT } from "@/const/agentConfig";
import { chatConfig } from "@/const/chatConfig";
import {
  portalChatConfigs,
  type PortalChatVariant,
} from "@/const/portalChatConfig";
import { USER_ROLES } from "@/const/modelConfig";
import { useConfig } from "@/hooks/useConfig";
import { useAuth } from "@/hooks/useAuth";
import { conversationService } from "@/services/conversationService";
import { API_ENDPOINTS } from "@/services/api";
import { fetchWithAuth } from "@/lib/auth";
import { storageService } from "@/services/storageService";
import  patientService  from "@/services/patientService";
import { useConversationManagement } from "@/hooks/chat/useConversationManagement";
import { getPortalMainAgent } from "@/services/portalAgentAssignmentService";

import { ChatSidebar } from "../components/chatLeftSidebar";
import type { FilePreview, PortalNavItemId } from "@/types/chat";
import { ChatHeader } from "../components/chatHeader";
import ConsultationStartModal from "../components/ConsultationStartModal";
import { ChatRightPanel } from "../components/chatRightPanel";
import { ChatStreamMain } from "../streaming/chatStreamMain";

import AdminAgentConfig from "../../admin/components/AdminAgentConfig";
import AgentAssignment from "../../admin/components/AgentAssignment";
import ModelConfig from "../../setup/models/config";
import KnowledgeConfig from "../../setup/knowledges/config";

// Doctor portal components
import { PatientListView } from "@/components/doctor/patients/PatientListView";
import { PatientDetailView } from "@/components/doctor/patients/PatientDetailView";
import { CaseLibraryView } from "@/components/doctor/cases/CaseLibraryView";
import { CaseDetailView } from "@/components/doctor/cases/CaseDetailView";
import { ConsultationHistoryView } from "@/components/doctor/consultations/ConsultationHistoryView";
import { ConsultationDetailView } from "@/components/doctor/consultations/ConsultationDetailView";
import { SpecialistAgentConfigView } from "@/components/doctor/consultations/SpecialistAgentConfigView";
import { TemplateListView } from "@/components/doctor/templates/TemplateListView";
import { KnowledgeGraphExplorer } from "@/components/doctor/knowledge-graph/KnowledgeGraphExplorer";

import { HealthMapExplorer } from "@/components/patient/health-map/HealthMapExplorer";

import { PatientProfileView } from "@/components/patient/profile/PatientProfileView";
import { CarePlanView } from "@/components/patient/care-plan/CarePlanView";
import { SymptomReportView } from "@/components/patient/symptom-report/SymptomReportView";
import { ReportCenterView } from "@/components/patient/report-center/ReportCenterView";
import type { SymptomFormData, BodyPart } from "@/types/symptomReport";

import {
  preprocessAttachments,
  handleFileUpload as preProcessHandleFileUpload,
  handleImageUpload as preProcessHandleImageUpload,
  uploadAttachments,
  createMessageAttachments,
  cleanupAttachmentUrls,
} from "@/app/chat/internal/chatPreprocess";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ConversationListItem, ApiConversationDetail } from "@/types/chat";
import { ChatMessageType } from "@/types/chat";
import { handleStreamResponse } from "@/app/chat/streaming/chatStreamHandler";
import {
  extractUserMsgFromResponse,
  extractAssistantMsgFromResponse,
} from "./extractMsgFromHistoryResponse";

import { X } from "lucide-react";
import log from "@/lib/logger";

const stepIdCounter = { current: 0 };

// Get internationalization key based on message type
const getI18nKeyByType = (type: string): string => {
  const typeToKeyMap: Record<string, string> = {
    "progress": "chatInterface.parsingFileWithProgress",
    "truncation": "chatInterface.fileTruncated",
  };
  return typeToKeyMap[type] || "";
};

interface ChatInterfaceProps {
  variant?: PortalChatVariant;
}

export function ChatInterface({ variant = "general" }: ChatInterfaceProps) {
  const router = useRouter();
  const { user } = useAuth(); // Get user information
  const [input, setInput] = useState("");
  // Replace the original messages state
  const [sessionMessages, setSessionMessages] = useState<{
    [conversationId: number]: ChatMessageType[];
  }>({});
  const [isSwitchedConversation, setIsSwitchedConversation] = useState(false); // Add conversation switching tracking state
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation("common");
  const portalConfig = portalChatConfigs[variant] || portalChatConfigs.general;
  const displayName =
    user?.email?.split("@")[0] ||
    portalConfig.defaultUserName ||
    "朋友";

  // Set default active view based on variant: admin uses first nav item, others use "chats"
  const defaultActiveView = variant === "admin" 
    ? (portalConfig.navItems[0]?.id || "agents")
    : "chats";
  const [activeView, setActiveView] = useState<PortalNavItemId>(defaultActiveView);

  // Doctor portal state management
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState<number | null>(null);
  const [caseLibraryTab, setCaseLibraryTab] = useState("search");

  // Linked patient/timeline state for current conversation (used when conversation not yet created)
  const [linkedPatientId, setLinkedPatientId] = useState<number | null>(null);
  const [linkedPatientName, setLinkedPatientName] = useState<string | null>(null);
  const [linkedTimelineId, setLinkedTimelineId] = useState<number | null>(null);
  const [linkedTimelineName, setLinkedTimelineName] = useState<string | null>(null);

  // Consultation modal state
  const [consultationModalVisible, setConsultationModalVisible] = useState(false);

  // Use conversation management hook
  const conversationManagement = useConversationManagement();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const { appConfig } = useConfig();

  // For each conversation, maintain independent SSE connections and states
  const [streamingConversations, setStreamingConversations] = useState<
    Set<number>
  >(new Set());
  const conversationControllersRef = useRef<Map<number, AbortController>>(
    new Map()
  );
  const conversationTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(
    new Map()
  );

  // Place the declaration of currentMessages after the definition of selectedConversationId
  // If a historical conversation is being loaded and there are no cached messages, return an empty array to avoid displaying error content
  const currentMessages = conversationManagement.selectedConversationId
    ? sessionMessages[conversationManagement.selectedConversationId] || []
    : [];
// Get current conversation from the list (for patient linking info)
  const currentConversation = conversationManagement.selectedConversationId
     ? conversationManagement.conversationList.find(
    (c) => c.conversation_id === conversationManagement.selectedConversationId
  )
: null;

  // Sync linked patient/timeline state with current conversation when it changes
  useEffect(() => {
    if (currentConversation) {
      // If currentConversation has patient/timeline info, use it (unless locally overridden)
      if (currentConversation.patient_id && linkedPatientId === null) {
        setLinkedPatientId(currentConversation.patient_id);
        setLinkedPatientName(currentConversation.patient_name ?? null);
      }
      if (currentConversation.linked_timeline_id && linkedTimelineId === null) {
        setLinkedTimelineId(currentConversation.linked_timeline_id);
        setLinkedTimelineName(currentConversation.linked_timeline_name ?? null);
      }
    }
  }, [currentConversation, linkedPatientId, linkedTimelineId]);
  // Monitor changes in currentMessages
  // Calculate if the current conversation is streaming
  const isCurrentConversationStreaming =
    conversationManagement.conversationId && conversationManagement.conversationId !== -1
      ? streamingConversations.has(conversationManagement.conversationId)
      : false;

  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Add attachment state management
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [fileUrls, setFileUrls] = useState<{ [id: string]: string }>({});


  // Auto-send flag for symptom report
  const pendingAutoSendRef = useRef(false);

  // Image upload purpose selection state
  const [showUploadPurposeModal, setShowUploadPurposeModal] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string>("");

  // OCR form modal state
  const [showOcrPatientForm, setShowOcrPatientForm] = useState(false);
  const [showOcrCaseForm, setShowOcrCaseForm] = useState(false);
  const [ocrImageUrl, setOcrImageUrl] = useState<string>("");

  const [isStreaming, setIsStreaming] = useState(false); // Add streaming state
  const abortControllerRef = useRef<AbortController | null>(null); // Add AbortController reference
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Add timeout reference

  // Add sidebar state control
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Add a state to track if we're loading a historical conversation
  const [isLoadingHistoricalConversation, setIsLoadingHistoricalConversation] =
    useState(false);

  // Add a state to track completed conversations that haven't been viewed yet
  const [completedConversations, setCompletedConversations] = useState<
    Set<number>
  >(new Set());

  // Add a ref to track the currently selected conversation ID for real-time access
  const currentSelectedConversationRef = useRef<number | null>(null);

  // Ensure right sidebar is closed by default
  const [showRightPanel, setShowRightPanel] = useState(false);

  const [selectedMessageId, setSelectedMessageId] = useState<
    string | undefined
  >();

  // Add force scroll to bottom state control
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  // Add agent selection state
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [portalMainAgentId, setPortalMainAgentId] = useState<number | null>(null);

  // Auto-load portal main agent for doctor/patient portals
  useEffect(() => {
    const loadPortalMainAgent = async () => {
      // Only auto-load for specific portal types, not for admin or general
      if (variant === "doctor" || variant === "patient") {
        try {
          const mainAgent = await getPortalMainAgent(variant);
          if (mainAgent && mainAgent.agent_id) {
            setPortalMainAgentId(mainAgent.agent_id);
            setSelectedAgentId(mainAgent.agent_id); // Auto-select the main agent
          } else {
            log.warn(`No main agent configured for portal: ${variant}`);
          }
        } catch (error) {
          log.error("Failed to load portal main agent:", error);
        }
      }
    };

    loadPortalMainAgent();
  }, [variant]);

  // Reset scroll to bottom state
  useEffect(() => {
    if (shouldScrollToBottom) {
      // Give enough time for scrolling to complete, then reset state
      const timer = setTimeout(() => {
        setShouldScrollToBottom(false);
      }, 1200); // Slightly longer than the last scroll delay in ChatStreamMain

      return () => clearTimeout(timer);
    }
  }, [shouldScrollToBottom]);

  // Add attachment cleanup function - cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      // Use preprocessing function to cleanup URLs
      cleanupAttachmentUrls(attachments, fileUrls);
    };
  }, [attachments, fileUrls]);

  // Handle file upload
  const handleFileUpload = (file: File) => {
    return preProcessHandleFileUpload(file, setFileUrls, t);
  };

  // Handle image upload - now triggers purpose selection modal
  const handleImageUpload = async (file: File) => {
    try {
      // Upload image to get URL
      const result = await storageService.uploadFiles([file], 'images');

      if (result.results && result.results.length > 0 && result.results[0].success) {
        const uploadedUrl = result.results[0].url;

        // Delay the attachment update to ensure the attachment is added first
        setTimeout(() => {
          setAttachments(prev => prev.map(att => {
            if (att.file === file) {
              return { ...att, uploadedUrl };
            }
            return att;
          }));
        }, 100);

        // Save pending image URL and show purpose selection modal
        setPendingImageUrl(uploadedUrl);
        setShowUploadPurposeModal(true);
      }
    } catch (error) {
      log.error("Failed to upload image:", error);
    }
  };

  // Handle image upload purpose selection
  const handleImagePurposeSelect = (purpose: "patient_record" | "case_record", imageUrl: string) => {
    if (purpose === "patient_record") {
      // Show OCR patient form
      setOcrImageUrl(imageUrl);
      setShowOcrPatientForm(true);
    } else if (purpose === "case_record") {
      // Show OCR case form
      setOcrImageUrl(imageUrl);
      setShowOcrCaseForm(true);
    }
  };

  // Add attachment management function
  const handleAttachmentsChange = (newAttachments: FilePreview[]) => {
    setAttachments(newAttachments);
  };

  // Define sidebar toggle function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle right panel toggle - keep it simple and clear
  const toggleRightPanel = () => {
    setShowRightPanel(!showRightPanel);
  };

  useEffect(() => {
    if (!conversationManagement.initialized.current) {
      conversationManagement.initialized.current = true;

      // Get conversation history list, but don't auto-select the latest conversation
      conversationManagement.fetchConversationList(variant)
        .then((dialogData) => {
          // Create new conversation by default regardless of history
          handleNewConversation();
        })
        .catch((err) => {
          log.error(t("chatInterface.errorFetchingConversationList"), err);
          // Create new conversation even if getting conversation list fails
          handleNewConversation();
        });
    }
  }, [appConfig]); // Add appConfig as dependency

  // Add useEffect to listen for conversationId changes, ensure right sidebar is always closed when conversation switches
  useEffect(() => {
    // Ensure right sidebar is reset to closed state whenever conversation ID changes
    setSelectedMessageId(undefined);
    setShowRightPanel(false);
    
    // Reset linked patient/timeline state when conversation changes
    // They will be repopulated from currentConversation if available
    setLinkedPatientId(null);
    setLinkedPatientName(null);
    setLinkedTimelineId(null);
    setLinkedTimelineName(null);
  }, [conversationManagement.conversationId]);


  // Clear all timers and requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort(t("chatInterface.componentUnmount"));
        } catch (error) {
          log.error(t("chatInterface.errorCancelingRequest"), error);
        }
        abortControllerRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Monitor messages for MCP tool responses and trigger report modals
  // Removed: Modal detection logic for parse_* tools (parse_lab_report, parse_imaging_report, etc.)
  // These tools have been deleted. Now using analyze_* tools which auto-save to database.

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return; // Allow sending attachments only, without text content

    // Flag to track if we should reset button states in finally block
    let shouldResetButtonStates = true;

    // If in new conversation state, switch to conversation state after sending message
    if (conversationManagement.isNewConversation) {
      conversationManagement.setIsNewConversation(false);
    }

    // Ensure right sidebar doesn't auto-expand when sending new message
    setSelectedMessageId(undefined);
    setShowRightPanel(false);

    // Handle user message content
    const userMessageId = uuidv4();
    const userMessageContent = input.trim();

    // Get current conversation ID
    let currentConversationId = conversationManagement.conversationId;

    // Ensure ref reflects the current conversation state
    if (currentConversationId && currentConversationId !== -1) {
      conversationManagement.currentSelectedConversationRef.current = currentConversationId;
    }

    // Prepare attachment information
    // Handle file upload
    let uploadedFileUrls: Record<string, string> = {};
    let objectNames: Record<string, string> = {}; // Add object name mapping

    if (attachments.length > 0) {
      // Show loading state
      setIsLoading(true);

      // Use preprocessing function to upload attachments
      const uploadResult = await uploadAttachments(attachments, t);
      uploadedFileUrls = uploadResult.uploadedFileUrls;
      objectNames = uploadResult.objectNames; // Get object name mapping
    }

    // Use preprocessing function to create message attachments
    const messageAttachments = createMessageAttachments(
      attachments,
      uploadedFileUrls,
      fileUrls
    );

    // Create user message object
    const userMessage: ChatMessageType = {
      id: userMessageId,
      role: USER_ROLES.USER,
      content: userMessageContent,
      timestamp: new Date(),
      attachments:
        messageAttachments.length > 0 ? messageAttachments : undefined,
    };

    // Clear input box and attachments
    setInput("");
    setAttachments([]);

    // Create initial AI reply message
    const assistantMessageId = uuidv4();
    const initialAssistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: ROLE_ASSISTANT,
      content: "",
      timestamp: new Date(),
      isComplete: false,
      steps: [],
    };

    // Send message and scroll to bottom
    setShouldScrollToBottom(true);

    setIsLoading(true);
    setIsStreaming(true); // Set streaming state to true

    // Create independent AbortController for current conversation
    const currentController = new AbortController();

    try {
      // Check if need to create new conversation
      if (!currentConversationId || currentConversationId === -1) {
        // If no session ID or ID is -1, create new conversation first
        try {
          const createData = await conversationService.create(
            t("chatInterface.newConversation"),
            variant
          );
          currentConversationId = createData.conversation_id;

          // Update current session state
          conversationManagement.setConversationId(currentConversationId);
          conversationManagement.setSelectedConversationId(currentConversationId);
          // Update ref to track current selected conversation
          conversationManagement.currentSelectedConversationRef.current = currentConversationId;
          conversationManagement.setConversationTitle(
            createData.conversation_title || t("chatInterface.newConversation")
          );

          // After creating new conversation, add it to streaming list
          setStreamingConversations((prev) => {
            const newSet = new Set(prev).add(currentConversationId);

            return newSet;
          });

          // Refresh conversation list
          try {
            const dialogList = await conversationManagement.fetchConversationList(variant);
            const newDialog = dialogList.find(
              (dialog) => dialog.conversation_id === currentConversationId
            );
            if (newDialog) {
              conversationManagement.setSelectedConversationId(currentConversationId);
            }
          } catch (error) {
            log.error(
              t("chatInterface.refreshDialogListFailedButContinue"),
              error
            );
          }
        } catch (error) {
          log.error(
            t("chatInterface.createDialogFailedButContinue"),
            error
          );
          // Reset button states when conversation creation fails
          setIsLoading(false);
          setIsStreaming(false);
          return;
        }
      }

      // Ensure valid conversation ID before registering controller and streaming state
      if (currentConversationId && currentConversationId !== -1) {
        conversationControllersRef.current.set(
          currentConversationId,
          currentController
        );
        setStreamingConversations((prev) => {
          const newSet = new Set(prev);
          newSet.add(currentConversationId);
          return newSet;
        });
      }

      // Now add messages after conversation is created/confirmed
      // 1. When sending user message, complete ChatMessageType fields
      setSessionMessages((prev) => ({
        ...prev,
        [currentConversationId]: [
          ...(prev[currentConversationId] || []),
          {
            ...userMessage,
            id: userMessage.id || uuidv4(),
            timestamp: userMessage.timestamp || new Date(),
            isComplete: userMessage.isComplete ?? true,
            steps: userMessage.steps || [],
            attachments: userMessage.attachments || [],
            images: userMessage.images || [],
          },
        ],
      }));

      // 2. When adding AI reply message, complete ChatMessageType fields
      setSessionMessages((prev) => ({
        ...prev,
        [currentConversationId]: [
          ...(prev[currentConversationId] || []),
          {
            ...initialAssistantMessage,
            id: initialAssistantMessage.id || uuidv4(),
            timestamp: initialAssistantMessage.timestamp || new Date(),
            isComplete: initialAssistantMessage.isComplete ?? false,
            steps: initialAssistantMessage.steps || [],
            attachments: initialAssistantMessage.attachments || [],
            images: initialAssistantMessage.images || [],
          },
        ],
      }));

      // If there are attachment files, preprocess first
      let finalQuery = userMessage.content;
      // Declare a variable to save file description information
      let fileDescriptionsMap: Record<string, string> = {};

      if (attachments.length > 0) {
        // Attachment preprocessing step, as independent step in assistant steps
        setSessionMessages((prev) => ({
          ...prev,
          [currentConversationId]: [
            ...(prev[currentConversationId] || []),
            {
              id: uuidv4(),
              role: ROLE_ASSISTANT,
              content: "",
              timestamp: new Date(),
              isComplete: false,
              steps: [
                {
                  id: `preprocess-${Date.now()}`,
                  title: t("chatInterface.filePreprocessing"),
                  content: "",
                  expanded: true,
                  metrics: "",
                  thinking: { content: "", expanded: false },
                  code: { content: "", expanded: false },
                  output: { content: "", expanded: false },
                  contents: [
                    {
                      id: `preprocess-content-${Date.now()}`,
                      type: chatConfig.contentTypes.PREPROCESS,
                      content: t("chatInterface.parsingFile"),
                      expanded: false,
                      timestamp: Date.now(),
                    },
                  ],
                },
              ],
            },
          ],
        }));

        // Buffer for truncation messages with deduplication
        const truncationBuffer: any[] = [];
        const processedTruncationIds = new Set<string>(); // Track processed truncation messages to avoid duplicates

        // Use extracted preprocessing function to process attachments
        const result = await preprocessAttachments(
          userMessage.content,
          attachments,
          currentController.signal,
          (jsonData) => {
            setSessionMessages((prev) => {
              const newMessages = { ...prev };
              const lastMsg =
                newMessages[currentConversationId]?.[
                  newMessages[currentConversationId].length - 1
                ];
              if (lastMsg && lastMsg.role === ROLE_ASSISTANT) {
                if (!lastMsg.steps) lastMsg.steps = [];
                // Find the latest preprocessing step
                let step = lastMsg.steps.find(
                  (s) => s.title === t("chatInterface.filePreprocessing")
                );
                if (!step) {
                  step = {
                    id: `preprocess-${Date.now()}`,
                    title: t("chatInterface.filePreprocessing"),
                    content: "",
                    expanded: true,
                    metrics: "",
                    thinking: { content: "", expanded: false },
                    code: { content: "", expanded: false },
                    output: { content: "", expanded: false },
                    contents: [
                      {
                        id: `preprocess-content-${Date.now()}`,
                        type: chatConfig.contentTypes.PREPROCESS,
                        content: t("chatInterface.parsingFile"),
                        expanded: false,
                        timestamp: Date.now(),
                      },
                    ],
                  };
                  lastMsg.steps.push(step);
                }

                // Handle truncation messages - buffer them instead of updating immediately
                if (jsonData.type === "truncation") {
                  // Create a unique ID for this truncation message to avoid duplicates
                  const truncationId = `${jsonData.filename || "unknown"}_${
                    jsonData.message || ""
                  }`;

                  // Only add if not already processed
                  if (!processedTruncationIds.has(truncationId)) {
                    truncationBuffer.push(jsonData);
                    processedTruncationIds.add(truncationId);
                  }
                  return newMessages; // Don't update stepContent for truncation
                }

                let stepContent = "";
                switch (jsonData.type) {
                  case "progress":
                    if (jsonData.message_data) {
                      const i18nKey = getI18nKeyByType(jsonData.type);
                      stepContent = String(
                        t(i18nKey, jsonData.message_data.params)
                      );
                    } else {
                      stepContent = jsonData.message || "";
                    }
                    break;
                  case "error":
                    stepContent = t("chatInterface.parseFileFailed", {
                      filename: jsonData.filename,
                      message: jsonData.message,
                    });
                    break;
                  case "file_processed":
                    stepContent = t("chatInterface.fileParsed", {
                      filename: jsonData.filename,
                    });
                    break;
                  case "complete":
                    // When complete, process all buffered truncation messages
                    if (truncationBuffer.length > 0) {
                      // Process truncation messages using internationalization
                      const truncationInfo = truncationBuffer
                        .map((truncation) => {
                          if (truncation.message_data) {
                            const i18nKey = getI18nKeyByType(truncation.type);
                            return String(
                              t(i18nKey, truncation.message_data.params)
                            );
                          } else {
                            return truncation.message;
                          }
                        })
                        .join(String(t("chatInterface.truncationSeparator")));

                      stepContent = t(
                        "chatInterface.fileParsingCompleteWithTruncation",
                        {
                          truncationInfo: truncationInfo,
                        }
                      );
                    } else {
                      stepContent = t("chatInterface.fileParsingComplete");
                    }
                    break;
                  default:
                    stepContent = jsonData.message || "";
                }
                // Only update the first content, don't add new ones
                if (step && step.contents && step.contents.length > 0) {
                  step.contents[0].content = stepContent;
                  step.contents[0].timestamp = Date.now();
                }
              }
              return newMessages;
            });
          },
          t,
          currentConversationId
        );

        // Handle preprocessing result
        if (!result.success) {
          // Reset button states immediately when preprocessing fails
          setIsLoading(false);
          setIsStreaming(false);
            
          // Remove from streaming conversations (both new and existing conversations)
          if (currentConversationId) {
            setStreamingConversations((prev) => {
              const newSet = new Set(prev);
              newSet.delete(currentConversationId);
              return newSet;
            });
          }
          
          setSessionMessages((prev) => {
            const newMessages = { ...prev };
            const lastMsg =
              newMessages[currentConversationId]?.[
                newMessages[currentConversationId].length - 1
              ];
            
            if (lastMsg && lastMsg.role === ROLE_ASSISTANT) {
              // Handle error codes with internationalization
              let errorMessage;
              if (result.error === 'REQUEST_ENTITY_TOO_LARGE') {
                errorMessage = t("chatInterface.fileSizeExceeded");
              } else if (result.error === 'FILE_PARSING_FAILED') {
                errorMessage = t("chatInterface.fileParsingFailed");
              } else {
                // For any other error, show a simple message
                errorMessage = t("chatInterface.fileProcessingStopped");
              }
              
              lastMsg.content = errorMessage;
              lastMsg.isComplete = true;
            }
            
            return newMessages;
          });
          shouldResetButtonStates = false; // Don't reset again in finally block
          return;
        }

        finalQuery = result.finalQuery;
        fileDescriptionsMap = result.fileDescriptions || {};
      }

      // Send request to backend API, add signal parameter
      const runAgentParams: any = {
        query: finalQuery, // Use preprocessed query or original query
        conversation_id: currentConversationId,
        is_set: isSwitchedConversation || currentMessages.length <= 1,
        history: currentMessages
          .filter((msg) => msg.id !== userMessage.id)
          .map((msg) => ({
            role: msg.role,
            content:
              msg.role === ROLE_ASSISTANT
                ? msg.finalAnswer?.trim() || msg.content || ""
                : msg.content || "",
          })),
        minio_files:
          messageAttachments.length > 0
            ? messageAttachments.map((attachment) => {
                // Get file description
                let description = "";
                if (attachment.name in fileDescriptionsMap) {
                  description = fileDescriptionsMap[attachment.name];
                }

                return {
                  object_name: objectNames[attachment.name] || "",
                  name: attachment.name,
                  type: attachment.type,
                  size: attachment.size,
                  url: uploadedFileUrls[attachment.name] || attachment.url,
                  description: description,
                };
              })
            : undefined, // Use complete attachment object structure
      };

      // Only add agent_id if it's not null
      if (selectedAgentId !== null) {
        runAgentParams.agent_id = selectedAgentId;
      }

      // Add portal context (so agent knows which portal user is from)
      runAgentParams.portal_type = variant;

      // Add user email for patient lookup (patient portal)
      if (user?.email) {
        runAgentParams.user_email = user.email;
      }

      // Add patient/timeline context for doctor portal (so agent knows which patient to save reports to)
      if (linkedPatientId !== null) {
        runAgentParams.patient_id = linkedPatientId;
      }
      if (linkedTimelineId !== null) {
        runAgentParams.timeline_id = linkedTimelineId;
      }

      const reader = await conversationService.runAgent(
        runAgentParams,
        currentController.signal
      );

      if (!reader) throw new Error("Response body is null");

      // Create dynamic setCurrentSessionMessages in handleSend function
      // setCurrentSessionMessages factory function
      const setCurrentSessionMessagesFactory =
        (
          targetConversationId: number
        ): React.Dispatch<React.SetStateAction<ChatMessageType[]>> =>
        (valueOrUpdater) => {
          setSessionMessages((prev) => {
            const prevArr = prev[targetConversationId] || [];
            let nextArr: ChatMessageType[];
            if (typeof valueOrUpdater === "function") {
              nextArr = (
                valueOrUpdater as (prev: ChatMessageType[]) => ChatMessageType[]
              )(prevArr);
            } else {
              nextArr = valueOrUpdater;
            }
            // Ensure new reference
            return {
              ...prev,
              [targetConversationId]: [...nextArr],
            };
          });
        };

      // Create resetTimeout function for current conversation
      const resetTimeout = () => {
        const timeout = conversationTimeoutsRef.current.get(
          currentConversationId
        );
        if (timeout) {
          clearTimeout(timeout);
        }
        const newTimeout = setTimeout(async () => {
          const controller = conversationControllersRef.current.get(
            currentConversationId
          );
          if (controller && !controller.signal.aborted) {
            try {
              controller.abort(t("chatInterface.requestTimeout"));

              setSessionMessages((prev) => {
                const newMessages = { ...prev };
                const lastMsg =
                  newMessages[currentConversationId]?.[
                    newMessages[currentConversationId].length - 1
                  ];
                if (lastMsg && lastMsg.role === ROLE_ASSISTANT) {
                  lastMsg.error = t("chatInterface.requestTimeoutRetry");
                  lastMsg.isComplete = true;
                  lastMsg.thinking = undefined;
                }
                return newMessages;
              });

              if (currentConversationId && currentConversationId !== -1) {
                try {
                  await conversationService.stop(currentConversationId);
                } catch (error) {
                  log.error(
                    t("chatInterface.stopTimeoutRequestFailed"),
                    error
                  );
                }
              }
            } catch (error) {
              log.error(t("chatInterface.errorCancelingRequest"), error);
            }
          }
          conversationTimeoutsRef.current.delete(currentConversationId);
        }, 120000);
        conversationTimeoutsRef.current.set(currentConversationId, newTimeout);
      };

      // Before processing streaming response, set an initial timeout first
      resetTimeout();

      // Call streaming processing function to handle response
      // Compatible with both function and direct assignment
      await handleStreamResponse(
        reader,
        setCurrentSessionMessagesFactory(currentConversationId),
        resetTimeout,
        stepIdCounter,
        setIsSwitchedConversation,
        conversationManagement.isNewConversation,
        conversationManagement.setConversationTitle,
        () => conversationManagement.fetchConversationList(variant),
        currentConversationId,
        conversationService,
        false, // isDebug: false for normal chat mode
        t
      );

      // Reset all related states
      setIsLoading(false);
      setIsStreaming(false);

      // Clean up controller and timeout for current conversation
      conversationControllersRef.current.delete(currentConversationId);
      const timeout = conversationTimeoutsRef.current.get(
        currentConversationId
      );
      if (timeout) {
        clearTimeout(timeout);
        conversationTimeoutsRef.current.delete(currentConversationId);
      }

      // Remove from streaming list (only when conversationId is not -1)
      if (currentConversationId !== -1) {
        setStreamingConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentConversationId);
          return newSet;
        });

        // When conversation is completed, only add to completed conversation list when user is not in current conversation interface
        // Use ref to get the actual conversation the user is in
        const currentUserConversation = currentSelectedConversationRef.current;
        if (currentUserConversation !== currentConversationId) {
          setCompletedConversations((prev) => {
            const newSet = new Set(prev);
            newSet.add(currentConversationId);
            return newSet;
          });
        }
      }

      // Note: Save operation is already implemented in agent run API, no need to save again in frontend
    } catch (error) {
      // If user actively canceled, don't show error message
      const err = error as Error;
      // Handle AbortError and BodyStreamBuffer aborted errors gracefully
      if (err.name === "AbortError" || err.message?.includes("aborted") || err.message?.includes("BodyStreamBuffer")) {
        setSessionMessages((prev) => {
          const newMessages = { ...prev };
          const lastMsg =
            newMessages[currentConversationId]?.[
              newMessages[currentConversationId].length - 1
            ];
          if (lastMsg && lastMsg.role === ROLE_ASSISTANT) {
            lastMsg.content = t("chatInterface.conversationStopped");
            lastMsg.isComplete = true;
            lastMsg.thinking = undefined; // Explicitly clear thinking state
          }
          return newMessages;
        });
      } else {
        log.error(t("chatInterface.errorLabel"), error);
        // Show user-friendly error message instead of technical error details
        const errorMessage = t("chatInterface.errorProcessingRequest");
        setSessionMessages((prev) => {
          const newMessages = { ...prev };
          const lastMsg =
            newMessages[currentConversationId]?.[
              newMessages[currentConversationId].length - 1
            ];
          if (lastMsg && lastMsg.role === ROLE_ASSISTANT) {
            lastMsg.content = errorMessage;
            lastMsg.isComplete = true;
            lastMsg.error = errorMessage;
            lastMsg.thinking = undefined; // Explicitly clear thinking state
          }
          return newMessages;
        });
      }

      setIsLoading(false);
      setIsStreaming(false);

      // Clean up controller and timeout for current conversation
      conversationControllersRef.current.delete(currentConversationId);
      const timeout = conversationTimeoutsRef.current.get(
        currentConversationId
      );
      if (timeout) {
        clearTimeout(timeout);
        conversationTimeoutsRef.current.delete(currentConversationId);
      }

      // Remove from streaming list (only when conversationId is not -1)
      if (currentConversationId !== -1) {
        setStreamingConversations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentConversationId);
          return newSet;
        });

        // When conversation is completed, only add to completed conversation list when user is not in current conversation interface
        // Use ref to get the actual conversation the user is in
        const currentUserConversation = currentSelectedConversationRef.current;
        if (currentUserConversation !== currentConversationId) {
          setCompletedConversations((prev) => {
            const newSet = new Set(prev);
            newSet.add(currentConversationId);
            return newSet;
          });
        }
      }
    } finally {
      // Only reset button states if we should (not when preprocessing fails)
      if (shouldResetButtonStates) {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Body part labels for symptom message formatting
  const BODY_PART_LABELS: Record<BodyPart, string> = {
    head_neck: "头颈部", chest: "胸部", abdomen: "腹部", back: "腰背部",
    limbs: "四肢", skin: "皮肤", whole_body: "全身", other: "其他",
  };
  const DURATION_LABELS: Record<string, string> = {
    today: "今天开始", days: "几天内", "1-2weeks": "1-2周", weeks: "数周", "month+": "超过1个月",
  };

  const handleSymptomStartChat = (formData: SymptomFormData) => {
    const parts = formData.body_parts.map((p) => BODY_PART_LABELS[p] || p).join("、");
    const symptoms = formData.symptom_tags.length > 0 ? formData.symptom_tags.join("、") : "";
    const dur = DURATION_LABELS[formData.duration] || formData.duration;

    let msg = `/symptom 不适部位：${parts}`;
    if (symptoms) msg += `；症状：${symptoms}`;
    msg += `；持续${dur}；严重程度 ${formData.severity}/10`;
    if (formData.description) msg += `；补充描述：${formData.description}`;

    // Start a new conversation, set input, switch to chat, and auto-send
    conversationManagement.handleNewConversation();
    setInput(msg);
    setActiveView("chats");
    pendingAutoSendRef.current = true;
  };

  // Auto-send when input is set from symptom report
  useEffect(() => {
    if (pendingAutoSendRef.current && input.trim()) {
      pendingAutoSendRef.current = false;
      handleSend();
    }
  }, [input]);

  const handleNewConversation = async () => {
    // When creating new conversation, keep all existing SSE connections active
    // Do not cancel any conversation requests, let them continue running in the background

    // Record current running conversation
    if (streamingConversations.size > 0) {
      // Keep existing SSE connections active
    }

    // Reset all states
    setInput("");
    setIsLoading(false);
    setIsSwitchedConversation(false);
    
    // Use conversation management hook
    conversationManagement.handleNewConversation();
    setIsLoadingHistoricalConversation(false); // Ensure not loading historical conversation

    // Reset streaming state
    setIsStreaming(false);

    // Reset selected message and right panel state
    setSelectedMessageId(undefined);
    setShowRightPanel(false);

    // Reset attachment state
    setAttachments([]);
    setFileUrls({});

    // Clear URL parameters
    const url = new URL(window.location.href);
    if (url.searchParams.has("q")) {
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
    }

    // Wait for all state updates to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Ensure new conversation scrolls to bottom
    setShouldScrollToBottom(true);
  };


  // When switching conversation, automatically load messages
  const handleDialogClick = async (dialog: ConversationListItem) => {
    // When switching conversation, keep all SSE connections active
    // Do not cancel any conversation requests, let them continue running in the background

    // Use conversation management hook
    conversationManagement.handleConversationSelect(dialog);
    setSelectedMessageId(undefined);
    setShowRightPanel(false);

    // When user views conversation, clear completed state
    setCompletedConversations((prev) => {
      const newSet = new Set(prev);
      newSet.delete(dialog.conversation_id);
      return newSet;
    });

    // Check if there are cached messages
    const hasCachedMessages =
      sessionMessages[dialog.conversation_id] !== undefined;
    const isCurrentActive = dialog.conversation_id === conversationManagement.conversationId;

    // Log: click conversation
    // If there are cached messages, ensure not to show loading state
    if (hasCachedMessages) {
      const cachedMessages = sessionMessages[dialog.conversation_id];
      // If cache is empty array, force reload historical messages
      if (cachedMessages && cachedMessages.length === 0) {
        setIsLoadingHistoricalConversation(true);
        setIsLoading(true);

        try {
          // Create new AbortController for current request
          const controller = new AbortController();

          // Set timeout timer - 120 seconds
          timeoutRef.current = setTimeout(() => {
            if (controller && !controller.signal.aborted) {
              try {
                controller.abort(t("chatInterface.requestTimeout"));
              } catch (error) {
                log.error(t("chatInterface.errorCancelingRequest"), error);
              }
            }
            timeoutRef.current = null;
          }, 120000);

          // Save current controller reference
          abortControllerRef.current = controller;

          // Use controller.signal to make request with timeout
          const data = await conversationService.getDetail(
            dialog.conversation_id,
            controller.signal
          );

          // Clear timeout timer after request completes
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          // Don't process result if request was canceled
          if (controller.signal.aborted) {
            return;
          }

          if (data.code === 0 && data.data && data.data.length > 0) {
            const conversationData = data.data[0] as ApiConversationDetail;
            const dialogMessages = conversationData.message || [];

            // Immediately process messages, do not use setTimeout
            const formattedMessages: ChatMessageType[] = [];

            // Optimized processing logic: process messages by role one by one, maintain original order
            dialogMessages.forEach((dialog_msg, index) => {
              if (dialog_msg.role === USER_ROLES.USER) {
                const formattedUserMsg: ChatMessageType =
                  extractUserMsgFromResponse(
                    dialog_msg,
                    index,
                    conversationData.create_time
                  );
                formattedMessages.push(formattedUserMsg);
              } else if (dialog_msg.role === ROLE_ASSISTANT) {
                const formattedAssistantMsg: ChatMessageType =
                  extractAssistantMsgFromResponse(
                    dialog_msg,
                    index,
                    conversationData.create_time,
                    t
                  );
                formattedMessages.push(formattedAssistantMsg);
              }
            });

            // Update message array
            setSessionMessages((prev) => ({
              ...prev,
              [dialog.conversation_id]: formattedMessages,
            }));

            // Clear any previous error for this conversation
            conversationManagement.clearConversationLoadError(dialog.conversation_id);

            // Asynchronously load all attachment URLs
            loadAttachmentUrls(formattedMessages, dialog.conversation_id);

            // Trigger scroll to bottom
            setShouldScrollToBottom(true);

            // Reset shouldScrollToBottom after a delay to ensure scrolling completes.
            setTimeout(() => {
              setShouldScrollToBottom(false);
            }, 1000);

            // Refresh history list
            conversationManagement.fetchConversationList(variant).catch((err) => {
              log.error(
                t("chatInterface.refreshDialogListFailedButContinue"),
                err
              );
            });
          } else {
            // No longer empty cache, only prompt no history messages
            conversationManagement.setConversationLoadErrorForId(
              dialog.conversation_id,
              t("chatStreamMain.noHistory") || "该会话无历史消息"
            );
          }
        } catch (error) {
          log.error(
            t("chatInterface.errorFetchingConversationDetailsError"),
            error
          );
          // if error, don't set empty array, keep existing state to avoid showing new conversation interface
          // Instead, we can show an error message or retry mechanism

          conversationManagement.setConversationLoadErrorForId(dialog.conversation_id, "Failed to load conversation");
        } finally {
          // ensure loading state is cleared
          setIsLoading(false);
          setIsLoadingHistoricalConversation(false);
        }
      } else {
        // Cache has content, display normally
        setIsLoadingHistoricalConversation(false);
        setIsLoading(false); // Ensure isLoading state is also reset

        // For cases where there are cached messages, also trigger scrolling to the bottom.
        setShouldScrollToBottom(true);
        setTimeout(() => {
          setShouldScrollToBottom(false);
        }, 1000);
      }
    }

    // If there are no cached messages and not current active conversation, load historical messages
    if (!hasCachedMessages && !isCurrentActive) {
      // Set loading historical conversation state
      setIsLoadingHistoricalConversation(true);
      setIsLoading(true);

      try {
        // Create new AbortController for current request
        const controller = new AbortController();

        // Set timeout timer - 120 seconds
        timeoutRef.current = setTimeout(() => {
          if (controller && !controller.signal.aborted) {
            try {
              controller.abort(t("chatInterface.requestTimeout"));
            } catch (error) {
              log.error(t("chatInterface.errorCancelingRequest"), error);
            }
          }
          timeoutRef.current = null;
        }, 120000);

        // Save current controller reference
        abortControllerRef.current = controller;

        // Use controller.signal to make request with timeout
        const data = await conversationService.getDetail(
          dialog.conversation_id,
          controller.signal
        );

        // Clear timeout timer after request completes
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Don't process result if request was canceled
        if (controller.signal.aborted) {
          return;
        }

        if (data.code === 0 && data.data && data.data.length > 0) {
          const conversationData = data.data[0] as ApiConversationDetail;
          const dialogMessages = conversationData.message || [];

          // Immediately process messages, do not use setTimeout
          const formattedMessages: ChatMessageType[] = [];

          // Optimized processing logic: process messages by role one by one, maintain original order
          dialogMessages.forEach((dialog_msg, index) => {
            if (dialog_msg.role === USER_ROLES.USER) {
              const formattedUserMsg: ChatMessageType =
                extractUserMsgFromResponse(
                  dialog_msg,
                  index,
                  conversationData.create_time
                );
              formattedMessages.push(formattedUserMsg);
            } else if (dialog_msg.role === ROLE_ASSISTANT) {
              const formattedAssistantMsg: ChatMessageType =
                extractAssistantMsgFromResponse(
                  dialog_msg,
                  index,
                  conversationData.create_time,
                  t
                );
              formattedMessages.push(formattedAssistantMsg);
            }
          });

          // Update message array
          setSessionMessages((prev) => ({
            ...prev,
            [dialog.conversation_id]: formattedMessages,
          }));

          // Clear any previous error for this conversation
          conversationManagement.clearConversationLoadError(dialog.conversation_id);

          // Asynchronously load all attachment URLs
          loadAttachmentUrls(formattedMessages, dialog.conversation_id);

          // Trigger scroll to bottom
          setShouldScrollToBottom(true);

          // Reset shouldScrollToBottom after a delay to ensure scrolling completes.
          setTimeout(() => {
            setShouldScrollToBottom(false);
          }, 1000);

          // Refresh history list
          conversationManagement.fetchConversationList(variant).catch((err) => {
            log.error(
              t("chatInterface.refreshDialogListFailedButContinue"),
              err
            );
          });
        } else {
          // No longer empty cache, only prompt no history messages
          conversationManagement.setConversationLoadErrorForId(
            dialog.conversation_id,
            t("chatStreamMain.noHistory") || "该会话无历史消息"
          );
        }
      } catch (error) {
        log.error(
          t("chatInterface.errorFetchingConversationDetailsError"),
          error
        );
        // if error, don't set empty array, keep existing state to avoid showing new conversation interface
        // Instead, we can show an error message or retry mechanism

        conversationManagement.setConversationLoadErrorForId(dialog.conversation_id, "Failed to load conversation");
      } finally {
        // ensure loading state is cleared
        setIsLoading(false);
        setIsLoadingHistoricalConversation(false);
      }
    }
  };

  // Add function to asynchronously load attachment URLs
  const loadAttachmentUrls = async (
    messages: ChatMessageType[],
    targetConversationId?: number
  ) => {
    // Create a copy to avoid directly modifying parameters
    const updatedMessages = [...messages];
    let hasUpdates = false;
    const conversationIdToUse = targetConversationId || conversationManagement.conversationId;

    // Process attachments for each message
    for (const message of updatedMessages) {
      if (message.attachments && message.attachments.length > 0) {
        // Get URL for each attachment
        for (const attachment of message.attachments) {
          if (attachment.object_name && !attachment.url) {
            try {
              // Get file URL
              const url = await storageService.getFileUrl(
                attachment.object_name
              );
              // Update attachment info
              attachment.url = url;
              hasUpdates = true;
            } catch (error) {
              log.error(
                t("chatInterface.errorFetchingAttachmentUrl", {
                  object_name: attachment.object_name,
                }),
                error
              );
            }
          }
        }
      }
    }

    // If there are updates, set new message array
    if (hasUpdates) {
      setSessionMessages((prev) => ({
        ...prev,
        [conversationIdToUse]: updatedMessages,
      }));
    }
  };

  // Left sidebar conversation title update
  const handleConversationRename = async (dialogId: number, title: string) => {
    try {
      await conversationService.rename(dialogId, title);
      await conversationManagement.fetchConversationList(variant);

      if (conversationManagement.selectedConversationId === dialogId) {
        conversationManagement.setConversationTitle(title);
      }
    } catch (error) {
      log.error(t("chatInterface.renameFailed"), error);
    }
  };

  // Left sidebar conversation deletion
  const handleConversationDeleteClick = async (dialogId: number) => {
    try {
      // If deleting the currently active conversation, stop conversation first
      if (
        conversationManagement.selectedConversationId === dialogId &&
        isStreaming &&
        conversationManagement.conversationId === dialogId
      ) {
        // Cancel current ongoing request first
        if (abortControllerRef.current) {
          try {
            abortControllerRef.current.abort(
              t("chatInterface.deleteConversation")
            );
          } catch (error) {
            log.error(t("chatInterface.errorCancelingRequest"), error);
          }
          abortControllerRef.current = null;
        }

        // Clear timeout timer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setIsStreaming(false);
        setIsLoading(false);

        try {
          await conversationService.stop(dialogId);
        } catch (error) {
          log.error(
            t("chatInterface.stopConversationToDeleteFailed"),
            error
          );
          // Continue deleting even if stopping fails
        }
      }

      await conversationService.delete(dialogId);
      await conversationManagement.fetchConversationList(variant);

      if (conversationManagement.selectedConversationId === dialogId) {
        conversationManagement.setSelectedConversationId(null);
        // Update ref to track current selected conversation
        conversationManagement.currentSelectedConversationRef.current = null;
        conversationManagement.setConversationTitle(t("chatInterface.newConversation"));
        handleNewConversation();
      }
    } catch (error) {
      log.error(t("chatInterface.deleteFailed"), error);
    }
  };

  // Add image error handling function
  const handleImageError = (imageUrl: string) => {
    log.error(t("chatInterface.imageLoadFailed"), imageUrl);

    // Remove failed images from messages
    setSessionMessages((prev) => {
      const newMessages = { ...prev };
      const lastMsg =
        newMessages[conversationManagement.conversationId]?.[newMessages[conversationManagement.conversationId].length - 1];

      if (lastMsg && lastMsg.role === ROLE_ASSISTANT && lastMsg.images) {
        // Filter out failed images
        lastMsg.images = lastMsg.images.filter((url) => url !== imageUrl);
      }

      return newMessages;
    });
  };

  // Handle image click preview
  const handleImageClick = (imageUrl: string) => {
    setViewingImage(imageUrl);
  };

  // Add conversation stop handling function
  const handleStop = async () => {
    // Stop agent_run of current conversation
    const currentController =
      conversationControllersRef.current.get(conversationManagement.conversationId);
    if (currentController) {
      try {
        currentController.abort(t("chatInterface.userManuallyStopped"));
      } catch (error) {
        log.error(t("chatInterface.errorCancelingRequest"), error);
      }
      conversationControllersRef.current.delete(conversationManagement.conversationId);
    }

    // Clear timeout timer for current conversation
    const currentTimeout = conversationTimeoutsRef.current.get(conversationManagement.conversationId);
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      conversationTimeoutsRef.current.delete(conversationManagement.conversationId);
    }

    // Immediately update frontend state
    setIsStreaming(false);
    setIsLoading(false);

    // If no valid conversation ID, just reset frontend state
    if (!conversationManagement.conversationId || conversationManagement.conversationId === -1) {
      return;
    }

    try {
      // Call backend stop API - this will stop both agent run and preprocess tasks
      await conversationService.stop(conversationManagement.conversationId);

      // Manually update messages, clear thinking state
      setSessionMessages((prev) => {
        const newMessages = { ...prev };
        const lastMsg =
          newMessages[conversationManagement.conversationId]?.[newMessages[conversationManagement.conversationId].length - 1];
        if (lastMsg && lastMsg.role === ROLE_ASSISTANT) {
          lastMsg.isComplete = true;
          lastMsg.thinking = undefined; // Explicitly clear thinking state

          // If this was a preprocess step, mark it as stopped
          if (lastMsg.steps && lastMsg.steps.length > 0) {
            const preprocessStep = lastMsg.steps.find(
              (step) => step.title === t("chatInterface.filePreprocessing")
            );
            if (preprocessStep) {
              const stoppedMessage =
                (t("chatInterface.fileProcessingStopped") as string) ||
                "File preprocessing stopped";
              preprocessStep.content = stoppedMessage;
              if (
                preprocessStep.contents &&
                preprocessStep.contents.length > 0
              ) {
                preprocessStep.contents[0].content = stoppedMessage;
              }
            }
          }
        }
        return newMessages;
      });

      // remove from streaming list
      setStreamingConversations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conversationManagement.conversationId);
        return newSet;
      });

      // when conversation is stopped, only add to completed conversations list when user is not in current conversation interface
      const currentUserConversation = currentSelectedConversationRef.current;
      if (currentUserConversation !== conversationManagement.conversationId) {
        setCompletedConversations((prev) => {
          const newSet = new Set(prev);
          newSet.add(conversationManagement.conversationId);
          return newSet;
        });
      }
    } catch (error) {
      log.error(t("chatInterface.stopConversationFailed"), error);

      // Optionally show error message
      setSessionMessages((prev) => {
        const newMessages = { ...prev };
        const lastMsg =
          newMessages[conversationManagement.conversationId]?.[newMessages[conversationManagement.conversationId].length - 1];
        if (lastMsg && lastMsg.role === ROLE_ASSISTANT) {
          lastMsg.isComplete = true;
          lastMsg.thinking = undefined; // Explicitly clear thinking state
          lastMsg.error = t(
            "chatInterface.stopConversationFailedButFrontendStopped"
          );
        }
        return newMessages;
      });
    }
  };

  // Top title rename function
  const handleTitleRename = async (newTitle: string) => {
    if (conversationManagement.selectedConversationId && newTitle !== conversationManagement.conversationTitle) {
      try {
        await conversationManagement.updateConversationTitle(conversationManagement.selectedConversationId, newTitle, variant);
      } catch (error) {
        log.error(t("chatInterface.renameFailed"), error);
      }
    }
  };

  // Handle starting a multi-agent consultation
  const handleStartConsultation = async (question: string, agentIds: number[], minioFiles?: { name: string; type: string; object_name: string; url: string }[]) => {
    let currentConversationId = conversationManagement.selectedConversationId;

    try {
      // Auto-create conversation if none exists (same as handleSend)
      if (!currentConversationId || currentConversationId === -1) {
        const createData = await conversationService.create(
          t("chatInterface.newConversation"),
          variant
        );
        const newId = createData.conversation_id;
        if (newId == null || typeof newId !== "number") {
          throw new Error("Create conversation returned invalid ID");
        }
        currentConversationId = newId;
        conversationManagement.setConversationId(currentConversationId);
        conversationManagement.setSelectedConversationId(currentConversationId);
        conversationManagement.currentSelectedConversationRef.current = currentConversationId;
        conversationManagement.setConversationTitle(
          createData.conversation_title || t("chatInterface.newConversation")
        );
        await conversationManagement.fetchConversationList(variant);
      }
      if (currentConversationId == null || currentConversationId === -1) {
        throw new Error("No valid conversation for consultation");
      }
      const consultationConversationId: number = currentConversationId;
      const response = await fetchWithAuth(API_ENDPOINTS.consultation.start, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          specialist_agent_ids: agentIds,
          max_rounds: 5,
          patient_id: linkedPatientId ?? currentConversation?.patient_id ?? null,
          conversation_id: consultationConversationId,
          minio_files: minioFiles || null,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start consultation");
      }

      // Create setMessages factory for current conversation (same pattern as handleSend)
      const setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>> =
        (valueOrUpdater) => {
          setSessionMessages((prev) => {
            const prevArr = prev[consultationConversationId] || [];
            let nextArr: ChatMessageType[];
            if (typeof valueOrUpdater === "function") {
              nextArr = (valueOrUpdater as (prev: ChatMessageType[]) => ChatMessageType[])(prevArr);
            } else {
              nextArr = valueOrUpdater;
            }
            return { ...prev, [consultationConversationId]: [...nextArr] };
          });
        };

      // Add user message (consultation question) and assistant placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: `consultation-user-${Date.now()}`,
          role: "user" as "user",
          content: `[多学科会诊] ${question}`,
          timestamp: new Date(),
          isComplete: true,
          showRawContent: true,
        },
        {
          id: `consultation-${Date.now()}`,
          role: ROLE_ASSISTANT as "assistant",
          content: "",
          timestamp: new Date(),
          isComplete: false,
          steps: [],
        },
      ]);

      // Process the SSE stream
      const reader = response.body.getReader();
      const stepIdCounter = { current: 0 };
      await handleStreamResponse(
        reader,
        setMessages,
        () => {}, // resetTimeout - consultation has its own timeout via backend
        stepIdCounter,
        setIsSwitchedConversation,
        false, // isNewConversation
        conversationManagement.setConversationTitle,
        () => conversationManagement.fetchConversationList(variant),
        consultationConversationId,
        conversationService,
        false, // isDebug
        t,
      );
    } catch (error) {
      log.error("Failed to start consultation:", error);
    }
  };

  // Handle message selection
  const handleMessageSelect = (messageId: string) => {
    if (messageId !== selectedMessageId) {
      // If clicking on new message, set as selected and open right panel
      setSelectedMessageId(messageId);
      // Auto open right panel
      setShowRightPanel(true);
    } else {
      // If clicking on already selected message, toggle panel state
      toggleRightPanel();
    }
  };

  // Like/dislike handling
  const handleOpinionChange = async (
    messageId: number,
    opinion: "Y" | "N" | null
  ) => {
    try {
      await conversationService.updateOpinion({
        message_id: messageId,
        opinion,
      });
      setSessionMessages((prev) => {
        const newMessages = { ...prev };
        // Update the opinion_flag for the specific message in all conversations
        Object.keys(newMessages).forEach((conversationId) => {
          const messages = newMessages[parseInt(conversationId)];
          if (messages) {
            const messageIndex = messages.findIndex(
              (msg) => msg.message_id === messageId
            );
            if (messageIndex !== -1) {
              newMessages[parseInt(conversationId)] = [...messages];
              newMessages[parseInt(conversationId)][messageIndex] = {
                ...newMessages[parseInt(conversationId)][messageIndex],
                opinion_flag: opinion || undefined,
              };
            }
          }
        });
        return newMessages;
      });
    } catch (error) {
      log.error(t("chatInterface.updateOpinionFailed"), error);
    }
  };

  // Add event listener for conversation list updates
  useEffect(() => {
    const handleConversationListUpdate = () => {
      conversationManagement.fetchConversationList(variant).catch((err) => {
        log.error(t("chatInterface.failedToUpdateConversationList"), err);
      });
    };

    window.addEventListener(
      "conversationListUpdated",
      handleConversationListUpdate
    );

    return () => {
      window.removeEventListener(
        "conversationListUpdated",
        handleConversationListUpdate
      );
    };
  }, []);

  // Handle settings click - not used when menu items are provided
  const handleSettingsClick = () => {
    // This function is kept for compatibility but not used
    // Both admin and regular users now use dropdown menus
  };

  // Settings menu items based on user role
  const settingsMenuItems = user?.role === "admin" ? [
    // Admin has three options
    {
      key: "models",
      label: t("chatLeftSidebar.settingsMenu.modelConfig"),
      onClick: () => {
        localStorage.setItem("show_page", "1");
        router.push("/setup/models");
      },
    },
    {
      key: "knowledges",
      label: t("chatLeftSidebar.settingsMenu.knowledgeConfig"),
      onClick: () => {
        router.push("/setup/knowledges");
      },
    },
    {
      key: "agents",
      label: t("chatLeftSidebar.settingsMenu.agentConfig"),
      onClick: () => {
        router.push("/setup/agents");
      },
    },
  ] : [
    // Regular user only has knowledge base configuration
    {
      key: "knowledges",
      label: t("chatLeftSidebar.settingsMenu.knowledgeConfig"),
      onClick: () => {
        router.push("/setup/knowledges");
      },
    },
  ];

  return (
    <>
      <div
        className="flex h-screen text-[#1A1A1A]"
        style={{
          backgroundColor: portalConfig.backgroundColor,
          backgroundImage: portalConfig.backgroundGradient || 'none'
        }}
      >
        <ChatSidebar
          conversationList={conversationManagement.conversationList}
          selectedConversationId={conversationManagement.selectedConversationId}
          openDropdownId={openDropdownId}
          streamingConversations={streamingConversations}
          completedConversations={completedConversations}
          onNewConversation={handleNewConversation}
          onDialogClick={handleDialogClick}
          onRename={handleConversationRename}
          onDelete={handleConversationDeleteClick}
          onSettingsClick={handleSettingsClick}
          settingsMenuItems={settingsMenuItems}
          onDropdownOpenChange={(open: boolean, id: string | null) =>
            setOpenDropdownId(open ? id : null)
          }
          onToggleSidebar={toggleSidebar}
          expanded={sidebarOpen}
          userEmail={user?.email}
          userAvatarUrl={user?.avatar_url}
          userRole={user?.role}
          userName={displayName}
          portalConfig={portalConfig}
          variant={variant}
          onNavItemClick={setActiveView}
          activeNavItem={activeView}
        />

        {activeView === "chats" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
              {/* Chat Area - Full width */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatHeader
                  title={conversationManagement.conversationTitle}
                  onRename={handleTitleRename}
                  portalConfig={portalConfig}
                  // Conversation-patient linking props (doctor portal only)
                  showPatientLinking={variant === "doctor"}
                  conversationId={conversationManagement.selectedConversationId}
                  patientId={linkedPatientId ?? currentConversation?.patient_id ?? null}
                  patientName={linkedPatientName ?? currentConversation?.patient_name ?? null}
                  timelineId={linkedTimelineId ?? currentConversation?.linked_timeline_id ?? null}
                  timelineName={linkedTimelineName ?? currentConversation?.linked_timeline_name ?? null}
                  onPatientChange={async (patientId, patientName) => {
                    setLinkedPatientId(patientId);
                    setLinkedPatientName(patientName);
                    setLinkedTimelineId(null);
                    setLinkedTimelineName(null);
                    await conversationManagement.fetchConversationList(variant);
                  }}
                  onTimelineChange={async (timelineId, timelineName) => {
                    setLinkedTimelineId(timelineId);
                    setLinkedTimelineName(timelineName);
                    await conversationManagement.fetchConversationList(variant);
                  }}
                  onStartConsultation={variant === "doctor" ? () => setConsultationModalVisible(true) : undefined}
                />

                <ChatStreamMain
                  messages={currentMessages}
                  input={input}
                  isLoading={isLoading}
                  isStreaming={isCurrentConversationStreaming}
                  isLoadingHistoricalConversation={
                    isLoadingHistoricalConversation
                  }
                  conversationLoadError={
                    conversationManagement.conversationLoadError[conversationManagement.selectedConversationId || 0]
                  }
                  onInputChange={(value: string) => setInput(value)}
                  onSend={handleSend}
                  onStop={handleStop}
                  onKeyDown={handleKeyDown}
                  onSelectMessage={handleMessageSelect}
                  selectedMessageId={selectedMessageId}
                  onImageClick={handleImageClick}
                  attachments={attachments}
                  onAttachmentsChange={handleAttachmentsChange}
                  onFileUpload={handleFileUpload}
                  onImageUpload={handleImageUpload}
                  onOpinionChange={handleOpinionChange}
                  onStartConsultation={variant === "doctor" ? handleStartConsultation : undefined}
                  currentConversationId={conversationManagement.conversationId}
                  shouldScrollToBottom={shouldScrollToBottom}
                  selectedAgentId={selectedAgentId}
                  onAgentSelect={setSelectedAgentId}
                  portalConfig={portalConfig}
                  userDisplayName={displayName}
                  hideAgentSelector={variant === "doctor" || variant === "patient"}
                  hideTemplates={variant === "patient"}
                />
              </div>

              <ChatRightPanel
                messages={currentMessages}
                onImageError={handleImageError}
                maxInitialImages={14}
                isVisible={showRightPanel}
                toggleRightPanel={toggleRightPanel}
                selectedMessageId={selectedMessageId}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-app-surface">
            {variant === "admin" ? (
              <>
                {activeView === "agents" && <AdminAgentConfig />}
                {activeView === "agent-assignment" && <AgentAssignment />}
                {activeView === "models" && <ModelConfig />}
                {activeView === "knowledge" && <KnowledgeConfig />}
              </>
            ) : variant === "doctor" ? (
              <>
                {activeView === "patients" && (
                  selectedPatientId ? (
                    <PatientDetailView
                      patientId={selectedPatientId}
                      onBack={() => setSelectedPatientId(null)}
                      onConversationClick={(conversationId: number) => {
                        // Switch to chats view
                        setActiveView("chats");
                        // Load the conversation
                        const conversation = conversationManagement.conversationList.find(
                          c => c.conversation_id === conversationId
                        );
                        if (conversation) {
                          conversationManagement.handleConversationSelect(conversation);
                        }
                      }}
                    />
                  ) : (
                    <PatientListView onSelectPatient={setSelectedPatientId} />
                  )
                )}
                {activeView === "cases" && (
                  selectedCaseId ? (
                    <CaseDetailView
                      caseId={selectedCaseId}
                      onBack={() => setSelectedCaseId(null)}
                    />
                  ) : (
                    <CaseLibraryView
                      activeTab={caseLibraryTab}
                      onTabChange={setCaseLibraryTab}
                      onSelectCase={setSelectedCaseId}
                    />
                  )
                )}
                {activeView === "consultations" && (
                  selectedConsultationId ? (
                    <ConsultationDetailView
                      consultationId={selectedConsultationId}
                      onBack={() => setSelectedConsultationId(null)}
                    />
                  ) : (
                    <ConsultationHistoryView
                      onSelectConsultation={setSelectedConsultationId}
                    />
                  )
                )}
                {activeView === "templates" && <TemplateListView />}
                {activeView === "specialist-config" && <SpecialistAgentConfigView />}
                {activeView === "knowledge-graph" && <KnowledgeGraphExplorer />}
              </>
            ) : variant === "patient" ? (
              <>
                {activeView === "profile" && <PatientProfileView />}
                {activeView === "report-center" && <ReportCenterView />}
                {activeView === "care-plan" && <CarePlanView />}
                {activeView === "symptom-report" && <SymptomReportView onStartChat={handleSymptomStartChat} />}
                {activeView === "health-map" && <HealthMapExplorer />}
              </>
            ) : (
              <div className="p-8 text-slate-600">
                {t("chatInterface.sectionComingSoon", {
                  defaultValue: "This section is coming soon.",
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <TooltipProvider>
        <Tooltip open={false}>
          <TooltipTrigger asChild>
            <div className="fixed inset-0 pointer-events-none" />
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="absolute bottom-24 left-1/2 transform -translate-x-1/2"
          >
            {t("chatInterface.stopGenerating")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Image preview */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-[90%] max-h-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingImage}
              alt={t("chatInterface.imagePreview")}
              className="max-w-full max-h-[90vh] object-contain"
              onError={() => {
                handleImageError(viewingImage);
              }}
            />
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-4 -right-4 bg-white p-1 rounded-full shadow-md hover:bg-white transition-colors"
              title={t("chatInterface.close")}
            >
              <X
                size={16}
                className="text-gray-600 hover:text-red-500 transition-colors"
              />
            </button>
          </div>
        </div>
      )}

      {/* Consultation Start Modal */}
      <ConsultationStartModal
        visible={consultationModalVisible}
        onClose={() => setConsultationModalVisible(false)}
        onStart={handleStartConsultation}
      />

    </>
  );
}
