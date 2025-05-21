import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import { X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/client/api";
import { useToast } from "~/client/utils";
import { motion } from "framer-motion";
import {
  Search,
  History,
  ArrowRight,
  ExternalLink,
  Loader2,
  Home,
  User,
  Calendar,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Separator,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Checkbox,
  Textarea,
} from "~/components/ui";

// Types
type Citation = {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  url: string;
};

type WebSearchResult = {
  title: string;
  snippet: string;
  url: string;
  source: string;
};

type UserEvidence = {
  content: string;
  title?: string;
  source: string;
  url?: string;
  type: "user_pdf" | "user_url";
};

type SearchResult = {
  id: string;
  answer: string;
  citations: Citation[];
  webResults: WebSearchResult[];
  userEvidence: UserEvidence[];
  useOnlyUserEvidence?: boolean;
  usePubMedOnly?: boolean;
  maxResults?: number;
  responseLanguage?: "ja" | "en";
  previousQueryId?: string;
  query?: string;
  translatedQuery?: string;
  userName?: string;
  userId?: string;
  createdAt?: Date;
  isFavorite?: boolean;
  feedback?: "good" | "bad";
  feedbackComment?: string;
  feedbackSubmittedAt?: string;
};

type SearchHistoryItem = {
  id: string;
  query: string;
  answerPreview: string;
  createdAt: Date;
  isFavorite: boolean;
  userName?: string;
  userId?: string;
};

type AuthStatus = {
  isAuthenticated: boolean;
  userId: string | null;
};

// Authentication context
const AuthContext = React.createContext<{
  authStatus: AuthStatus;
  checkAuth: () => Promise<AuthStatus>;
  userData: {
    name: string;
    birthDate: string;
    gender: string;
    university: string;
    graduationYear: string;
    specialization: string;
    email: string;
  } | null;
}>({
  authStatus: { isAuthenticated: false, userId: null },
  checkAuth: async () =>
    Promise.resolve({ isAuthenticated: false, userId: null }),
  userData: null,
});

function useAuth() {
  return React.useContext(AuthContext);
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    userId: null,
  });
  const [userData, setUserData] = useState<{
    name: string;
    birthDate: string;
    gender: string;
    university: string;
    graduationYear: string;
    specialization: string;
    email: string;
  } | null>(null);
  const { toast } = useToast();

  // Load session token from localStorage
  const getSessionToken = () => {
    const token = localStorage.getItem("sessionToken");
    return token || undefined;
  };

  // Save session token to localStorage
  const saveSessionToken = (token: string) => {
    localStorage.setItem("sessionToken", token);
  };

  // Save user data to localStorage
  const saveUserData = (data: any) => {
    localStorage.setItem("userData", JSON.stringify(data));
  };

  // Load user data from localStorage
  const loadUserData = () => {
    const data = localStorage.getItem("userData");
    if (data) {
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (parsed && typeof parsed === "object") {
          return {
            name: typeof parsed.name === "string" ? parsed.name : "",
            birthDate:
              typeof parsed.birthDate === "string" ? parsed.birthDate : "",
            gender: typeof parsed.gender === "string" ? parsed.gender : "",
            university:
              typeof parsed.university === "string" ? parsed.university : "",
            graduationYear:
              typeof parsed.graduationYear === "string"
                ? parsed.graduationYear
                : "",
            specialization:
              typeof parsed.specialization === "string"
                ? parsed.specialization
                : "",
            email: typeof parsed.email === "string" ? parsed.email : "",
          };
        }
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
    return null;
  };

  const checkAuth = async () => {
    try {
      const sessionToken = getSessionToken();
      console.log(
        `Checking authentication with token: ${sessionToken?.substring(0, 5) || "undefined"}...`,
      );

      const status = await apiClient.checkAuthentication({ sessionToken });
      setAuthStatus(status);

      // If authenticated, try to load user profile
      if (status.isAuthenticated) {
        console.log("User is authenticated, loading profile...");
        try {
          const profile = await apiClient.getUserProfile({ sessionToken });
          // Ensure all fields are strings
          const userData = {
            name: profile.name || "",
            birthDate: profile.birthDate || "",
            gender: profile.gender || "",
            university: profile.university || "",
            graduationYear: profile.graduationYear || "",
            specialization: profile.specialization || "",
            email: profile.email || "",
          };
          setUserData(userData);
          saveUserData(userData);
          console.log("User profile loaded successfully");
        } catch (profileError) {
          console.error("Failed to load user profile:", profileError);
          // If we can't load the profile, try to use cached data
          const cachedData = loadUserData();
          if (cachedData) {
            console.log("Using cached user data from localStorage");
            setUserData(cachedData);
          }
        }
      } else {
        console.log("User is not authenticated");
        // If not authenticated, always try to re-register with cached data
        const cachedData = loadUserData();
        if (cachedData && cachedData.email) {
          console.log("Attempting automatic re-registration with cached data");
          try {
            const result = await apiClient.registerMedicalUser({
              name: cachedData.name,
              birthDate: cachedData.birthDate,
              gender: cachedData.gender,
              university: cachedData.university,
              graduationYear: cachedData.graduationYear,
              specialization: cachedData.specialization,
              email: cachedData.email,
            });

            if (result.success) {
              console.log("Auto re-registration successful");
              // Save the new session token
              if (result.sessionToken) {
                saveSessionToken(result.sessionToken);
              }
              // Update auth status
              setAuthStatus({
                isAuthenticated: true,
                userId: result.userId ?? null,
              });
              return { isAuthenticated: true, userId: result.userId ?? null };
            }
          } catch (reRegisterError) {
            console.error("Auto re-registration failed:", reRegisterError);
            // If re-registration fails and we have a token, try clearing it and retrying once
            if (sessionToken) {
              console.log("Clearing invalid session token and retrying...");
              localStorage.removeItem("sessionToken");
              try {
                const retryResult = await apiClient.registerMedicalUser({
                  name: cachedData.name,
                  birthDate: cachedData.birthDate,
                  gender: cachedData.gender,
                  university: cachedData.university,
                  graduationYear: cachedData.graduationYear,
                  specialization: cachedData.specialization,
                  email: cachedData.email,
                });

                if (retryResult.success) {
                  console.log(
                    "Retry registration successful after clearing token",
                  );
                  if (retryResult.sessionToken) {
                    saveSessionToken(retryResult.sessionToken);
                  }
                  setAuthStatus({
                    isAuthenticated: true,
                    userId: retryResult.userId ?? null,
                  });
                  return {
                    isAuthenticated: true,
                    userId: retryResult.userId ?? null,
                  };
                }
              } catch (retryError) {
                console.error("Retry registration failed:", retryError);
              }
            }
          }
        }
      }

      return status;
    } catch (error) {
      console.error("Authentication check failed:", error);
      setAuthStatus({ isAuthenticated: false, userId: null });
      return { isAuthenticated: false, userId: null };
    }
  };

  // Check authentication on initial load
  useEffect(() => {
    // Load user data from localStorage first for immediate UI display
    const cachedData = loadUserData();
    if (cachedData) {
      setUserData(cachedData);
    }

    // Then verify with the server
    void checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ authStatus, checkAuth, userData }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Allow access to all routes without requiring authentication
  return <>{children}</>;
}

// Navigation component
function Navigation() {
  const { authStatus } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <h1 className="text-2xl font-bold text-primary">メドエビデンス</h1>
        </Link>
        <div className="flex gap-4 items-center">
          {authStatus.isAuthenticated ? (
            <>
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  ホーム
                </Button>
              </Link>
              <Link to="/history">
                <Button variant="ghost" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  履歴
                </Button>
              </Link>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              <User className="h-4 w-4 inline mr-1" />
              医師専用
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// Home page component
function HomePage() {
  // Set default query for testing
  const defaultQuery = "糖尿病の最新治療法";
  const [query, setQuery] = useState(defaultQuery);
  const [maxResults, setMaxResults] = useState<number>(5);
  const [responseLanguage, setResponseLanguage] = useState<"ja" | "en">("ja");
  const [usePubMedOnly, setUsePubMedOnly] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 削除された機能: ファイルアップロード、URL追加、エビデンス削除

  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);

  // Mutation for starting the medical query process
  const processMutation = useMutation(
    (params: {
      query: string;
      maxResults: number;
      usePubMedOnly: boolean;
      responseLanguage: "ja" | "en";
    }) => {
      // Skip authentication for search functionality
      return apiClient.processMedicalQuery({
        ...params,
        // Create a temporary session if needed
        sessionToken: "temp-session-for-search",
      });
    },
    {
      onSuccess: (data) => {
        if (!data || !data.taskId) {
          toast({
            title: "エラー",
            description:
              "検索結果の処理中に問題が発生しました。もう一度お試しください。",
            variant: "destructive",
          });
          return;
        }
        // Store the task ID and start polling for status
        setTaskId(typeof data.taskId === "string" ? data.taskId : "");
        setTaskStatus("RUNNING");
      },
      onError: (error) => {
        console.error("Error in processMedicalQuery mutation:", error);
        toast({
          title: "エラー",
          description:
            "医学情報の検索中に問題が発生しました。インターネット接続を確認して、もう一度お試しください。",
          variant: "destructive",
        });
      },
      retry: 1, // Add a retry attempt
    },
  );

  // Mutation for checking task status
  const checkTaskStatusMutation = useMutation(
    (taskId: string) => apiClient.getMedicalQueryStatus({ taskId }),
    {
      onSuccess: (data) => {
        setTaskStatus(data.status);
        if (data.status === "COMPLETED") {
          // When task is complete, get the results
          getTaskResultsMutation.mutate(taskId!);
        } else if (data.status === "FAILED") {
          toast({
            title: "エラー",
            description: `検索処理に失敗しました: ${data.error?.message || "不明なエラー"}`,
            variant: "destructive",
          });
        }
      },
      retry: 0,
    },
  );

  // Mutation for getting task results
  const getTaskResultsMutation = useMutation(
    (taskId: string) => apiClient.getMedicalQueryResults({ taskId }),
    {
      onSuccess: (data) => {
        if (!data || !data.id) {
          toast({
            title: "エラー",
            description:
              "検索結果の取得に失敗しました。もう一度お試しください。",
            variant: "destructive",
          });
          return;
        }
        queryClient.invalidateQueries(["searchHistory"]);
        // Reset task state
        setTaskId(null);
        setTaskStatus(null);
        // Navigate to results
        navigate(`/results/${data.id}`);
      },
      onError: (error) => {
        console.error("Error getting task results:", error);
        toast({
          title: "エラー",
          description: "検索結果の取得に失敗しました。もう一度お試しください。",
          variant: "destructive",
        });
        // Reset task state
        setTaskId(null);
        setTaskStatus(null);
      },
    },
  );

  // Poll for task status when taskId is set
  const { mutate: checkTaskStatus } = checkTaskStatusMutation;
  useEffect(() => {
    if (!taskId || taskStatus !== "RUNNING") return;
    const interval = setInterval(() => {
      checkTaskStatus(taskId);
    }, 2000);
    return () => clearInterval(interval);
  }, [taskId, taskStatus]); // Removed checkTaskStatus from dependencies to avoid infinite loop

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      processMutation.mutate({
        query,
        maxResults,
        usePubMedOnly,
        responseLanguage,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">エビデンスに基づく医療情報</h1>
        <p className="text-lg text-muted-foreground mb-8">
          医学研究の質問をして、エビデンスに基づく回答を得る
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-6 text-lg min-h-[150px] resize-none"
              placeholder="医学的な質問を入力してください"
              disabled={processMutation.isLoading}
            />
            <Search className="absolute right-4 top-6 text-muted-foreground" />
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <div className="flex flex-col gap-2">
              <Label htmlFor="max-results">エビデンス数</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max-results"
                  type="number"
                  min="1"
                  max="5"
                  value={maxResults.toString()}
                  onChange={(e) =>
                    setMaxResults(Math.min(5, Number(e.target.value)))
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  件のエビデンスを検索
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="response-language">回答言語</Label>
              <Select
                value={responseLanguage}
                onValueChange={(value) =>
                  setResponseLanguage(value as "ja" | "en")
                }
              >
                <SelectTrigger
                  id="response-language"
                  className="w-full md:w-[200px]"
                >
                  <SelectValue placeholder="回答言語を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">英語 (English)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-row items-center gap-2 md:self-end">
              <Checkbox
                id="use-pubmed-only"
                checked={usePubMedOnly}
                onCheckedChange={(checked) => {
                  setUsePubMedOnly(checked === true);
                }}
              />
              <Label htmlFor="use-pubmed-only">
                PubMed掲載論文のみを使用する
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={
              processMutation.isLoading ||
              checkTaskStatusMutation.isLoading ||
              getTaskResultsMutation.isLoading ||
              taskStatus === "RUNNING" ||
              !query.trim()
            }
            className="w-full md:w-auto md:mx-auto px-8"
          >
            {processMutation.isLoading ||
            checkTaskStatusMutation.isLoading ||
            getTaskResultsMutation.isLoading ||
            taskStatus === "RUNNING" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {taskStatus === "RUNNING" ? "検索処理中..." : "検索中..."}
              </>
            ) : (
              <>
                医学的エビデンスを検索
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-semibold mb-6 text-center">使い方</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>1. 質問する</CardTitle>
            </CardHeader>
            <CardContent>
              <p>自然言語で医学的な研究質問を入力する</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. ソースを検索</CardTitle>
            </CardHeader>
            <CardContent>
              <p>最も関連性の高い医学情報について検索します</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. エビデンスを取得</CardTitle>
            </CardHeader>
            <CardContent>
              <p>原著論文の引用を含む総合的な回答を受け取る</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Results page component
// 想定される質問を生成する関数
function generateSuggestedQuestions(query = ""): string[] {
  // 基本的な質問のテンプレート
  const basicQuestions = [
    "この治療法の最新の研究結果はありますか？",
    "副作用にはどのようなものがありますか？",
    "代替治療法はありますか？",
  ];

  // 特定のキーワードに基づいて質問を生成
  if (
    query.includes("治療") ||
    query.includes("療法") ||
    query.includes("treatment")
  ) {
    return [
      "この治療法の長期的な効果はどうですか？",
      "この治療法に関連する副作用にはどのようなものがありますか？",
      "代替治療法として何が考えられますか？",
    ];
  } else if (
    query.includes("症状") ||
    query.includes("signs") ||
    query.includes("symptoms")
  ) {
    return [
      "これらの症状が見られる他の疾患はありますか？",
      "症状が悪化した場合、どのような対処が必要ですか？",
      "これらの症状を軽減するための自己管理方法はありますか？",
    ];
  } else if (
    query.includes("診断") ||
    query.includes("検査") ||
    query.includes("diagnosis") ||
    query.includes("test")
  ) {
    return [
      "この検査の精度はどの程度ですか？",
      "診断のための他の検査方法はありますか？",
      "検査結果の解釈に影響する要因はありますか？",
    ];
  } else if (
    query.includes("予防") ||
    query.includes("防止") ||
    query.includes("prevention")
  ) {
    return [
      "予防効果を高めるためのライフスタイルの変更はありますか？",
      "予防措置の効果はどの程度確立されていますか？",
      "リスク要因を軽減するための具体的な方法はありますか？",
    ];
  } else if (
    query.includes("薬") ||
    query.includes("投薬") ||
    query.includes("medication") ||
    query.includes("drug")
  ) {
    return [
      "この薬と併用すべきでない薬はありますか？",
      "投薬量や頻度の調整が必要な場合はありますか？",
      "長期使用による潜在的なリスクはありますか？",
    ];
  }

  // デフォルトの質問を返す
  return basicQuestions;
}

function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [followUpUsePubMedOnly, setFollowUpUsePubMedOnly] = useState(false);
  const queryClient = useQueryClient();
  const [feedbackComment, setFeedbackComment] = useState("");

  // お気に入りを切り替えるためのmutation
  const toggleFavoriteMutation = useMutation(
    () => {
      const sessionToken = localStorage.getItem("sessionToken") || undefined;
      return apiClient.toggleFavorite({ id: id!, sessionToken });
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(["searchQuery", id]);
        queryClient.invalidateQueries(["searchHistory"]);
        toast({
          title: data.isFavorite
            ? "お気に入りに追加しました"
            : "お気に入りから削除しました",
          duration: 2000,
        });
      },
      onError: (error) => {
        toast({
          title: "エラー",
          description: "お気に入り登録の変更に失敗しました",
          variant: "destructive",
        });
      },
    },
  );

  // フィードバックを送信するためのmutation
  const submitFeedbackMutation = useMutation(
    ({ feedback, comment }: { feedback: "good" | "bad"; comment?: string }) => {
      const sessionToken = localStorage.getItem("sessionToken") || undefined;
      return apiClient.submitFeedback({
        id: id!,
        feedback,
        comment,
        sessionToken,
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["searchQuery", id]);
        toast({
          title: "フィードバックを送信しました",
          description: "ご協力ありがとうございます",
          duration: 2000,
        });
        setFeedbackComment(""); // コメント入力欄をクリア
      },
      onError: (error) => {
        toast({
          title: "エラー",
          description: "フィードバックの送信に失敗しました",
          variant: "destructive",
        });
      },
    },
  );

  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);

  // Mutation for starting the medical query process
  const processMutation = useMutation(
    (params: {
      query: string;
      maxResults: number;
      usePubMedOnly: boolean;
      responseLanguage: "ja" | "en";
      previousQueryId?: string;
    }) => {
      const sessionToken = localStorage.getItem("sessionToken");
      return apiClient.processMedicalQuery({
        ...params,
        sessionToken: sessionToken || undefined,
      });
    },
    {
      onSuccess: (data) => {
        if (!data || !data.taskId) {
          toast({
            title: "エラー",
            description:
              "検索結果の処理中に問題が発生しました。もう一度お試しください。",
            variant: "destructive",
          });
          return;
        }
        // Store the task ID and start polling for status
        setTaskId(typeof data.taskId === "string" ? data.taskId : "");
        setTaskStatus("RUNNING");
        setFollowUpQuery(""); // リセット
      },
      onError: (error) => {
        console.error("Error in processMedicalQuery mutation:", error);
        toast({
          title: "エラー",
          description:
            "医学情報の検索中に問題が発生しました。インターネット接続を確認して、もう一度お試しください。",
          variant: "destructive",
        });
      },
    },
  );

  // Mutation for checking task status
  const checkTaskStatusMutation = useMutation(
    (taskId: string) => apiClient.getMedicalQueryStatus({ taskId }),
    {
      onSuccess: (data) => {
        setTaskStatus(data.status);
        if (data.status === "COMPLETED") {
          // When task is complete, get the results
          getTaskResultsMutation.mutate(taskId!);
        } else if (data.status === "FAILED") {
          toast({
            title: "エラー",
            description: `検索処理に失敗しました: ${data.error?.message || "不明なエラー"}`,
            variant: "destructive",
          });
        }
      },
      retry: 0,
    },
  );

  // Mutation for getting task results
  const getTaskResultsMutation = useMutation(
    (taskId: string) => apiClient.getMedicalQueryResults({ taskId }),
    {
      onSuccess: (data) => {
        if (!data || !data.id) {
          toast({
            title: "エラー",
            description:
              "検索結果の取得に失敗しました。もう一度お試しください。",
            variant: "destructive",
          });
          return;
        }
        queryClient.invalidateQueries(["searchHistory"]);
        // Reset task state
        setTaskId(null);
        setTaskStatus(null);
        // Navigate to results
        navigate(`/results/${data.id}`);
      },
      onError: (error) => {
        console.error("Error getting task results:", error);
        toast({
          title: "エラー",
          description: "検索結果の取得に失敗しました。もう一度お試しください。",
          variant: "destructive",
        });
        // Reset task state
        setTaskId(null);
        setTaskStatus(null);
      },
    },
  );

  // Poll for task status when taskId is set
  useEffect(() => {
    if (!taskId || taskStatus !== "RUNNING") return;

    const interval = setInterval(() => {
      checkTaskStatusMutation.mutate(taskId);
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [taskId, taskStatus]); // Removed checkTaskStatusMutation from dependencies to avoid infinite loop
  const {
    data: rawData,
    isLoading,
    error,
  } = useQuery(
    ["searchQuery", id],
    () => apiClient.getSearchQuery({ id: id! }),
    {
      enabled: !!id,
      onSuccess: (data) => {
        // 元のクエリの設定を追加質問の初期値として設定
        setFollowUpUsePubMedOnly(data.usePubMedOnly || false);
      },
      onError: (err) => {
        toast({
          title: "エラー",
          description:
            err instanceof Error && err.message === "Search query not found"
              ? "検索クエリが見つかりませんでした。新しい検索を試してください。"
              : "結果の読み込みに失敗しました。もう一度お試しください。",
          variant: "destructive",
        });

        // Navigate back to home if the query is not found
        if (err instanceof Error && err.message === "Search query not found") {
          setTimeout(() => navigate("/"), 1500);
        }
      },
    },
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = rawData as SearchResult | undefined;

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p>結果の読み込みに失敗しました。もう一度お試しください。</p>
          </CardContent>
          <CardFooter>
            <Link to="/">
              <Button>ホームに戻る</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Query: {data.query}</CardTitle>
              {data.translatedQuery && data.translatedQuery !== data.query && (
                <CardDescription className="text-primary font-medium">
                  PubMed検索用英語クエリ: {data.translatedQuery}
                </CardDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavoriteMutation.mutate()}
              className="h-10 w-10 rounded-full"
              aria-label={
                data.isFavorite ? "お気に入りから削除" : "お気に入りに追加"
              }
            >
              {data.isFavorite ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6 text-yellow-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                  />
                </svg>
              )}
            </Button>
          </div>
          <CardDescription>
            {!data.useOnlyUserEvidence && (
              <>
                {data.citations.length}件のPubMed
                {data.citations.length === 1 ? "記事" : "記事"}
                {!data.usePubMedOnly && data.webResults.length > 0 && (
                  <>
                    と{data.webResults.length}件のウェブ
                    {data.webResults.length === 1 ? "ソース" : "ソース"}
                  </>
                )}
              </>
            )}
            {data.userEvidence && data.userEvidence.length > 0 && (
              <>
                {!data.useOnlyUserEvidence && "および"}
                {data.userEvidence.length}件のユーザー提供エビデンス
              </>
            )}
            に基づく
            {data.maxResults && (
              <span className="ml-2">・エビデンス数: {data.maxResults}件</span>
            )}
            {data.useOnlyUserEvidence && (
              <span className="ml-2 font-semibold text-primary">
                ・ユーザー提供エビデンスのみ使用
              </span>
            )}
            {data.usePubMedOnly && !data.useOnlyUserEvidence && (
              <span className="ml-2 font-semibold text-primary">
                ・PubMed掲載論文のみ使用
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            {data.answer
              .replace(/\[Web Source (\d+)\]/g, (match, p1) => {
                const index = parseInt(p1, 10) - 1;
                if (index >= 0 && index < data.webResults.length) {
                  return `[Web Source ${p1}]`;
                }
                return match;
              })
              .replace(/\[User Source (\d+)\]/g, (match, p1) => {
                const index = parseInt(p1, 10) - 1;
                if (
                  index >= 0 &&
                  data.userEvidence &&
                  index < data.userEvidence.length
                ) {
                  return `[User Source ${p1}]`;
                }
                return match;
              })
              .split(/\[(?:PMID: (\d+)|Web Source (\d+)|User Source (\d+))\]/g)
              .map((part, i, arr) => {
                if (i % 4 === 0) {
                  // Adjusted for 3 capture groups + text
                  return <span key={i}>{part}</span>;
                } else if (
                  arr[i] &&
                  arr[i + 1] === undefined &&
                  arr[i + 2] === undefined
                ) {
                  // PMID citation
                  const pmid = part;
                  return (
                    <a
                      key={i}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium no-underline"
                    >
                      [PMID: {pmid}]
                    </a>
                  );
                } else if (
                  arr[i] === undefined &&
                  arr[i + 1] !== undefined &&
                  arr[i + 2] === undefined
                ) {
                  // Web source citation
                  const sourceIndexStr = arr[i + 1] || "";
                  const sourceIndex = parseInt(sourceIndexStr, 10) - 1;
                  if (
                    sourceIndex >= 0 &&
                    sourceIndex < data.webResults.length
                  ) {
                    const source = data.webResults[sourceIndex];
                    if (source && source.url) {
                      return (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-medium no-underline"
                        >
                          [Web Source {sourceIndex + 1}]
                        </a>
                      );
                    }
                    return <span key={i}>[Web Source {sourceIndex + 1}]</span>;
                  }
                  return <span key={i}>[Web Source {sourceIndexStr}]</span>;
                } else if (
                  arr[i] === undefined &&
                  arr[i + 1] === undefined &&
                  arr[i + 2] !== undefined
                ) {
                  // User source citation
                  const sourceIndexStr = arr[i + 2] || "";
                  const sourceIndex = parseInt(sourceIndexStr, 10) - 1;
                  if (
                    sourceIndex >= 0 &&
                    data.userEvidence &&
                    sourceIndex < data.userEvidence.length
                  ) {
                    const source = data.userEvidence[sourceIndex];
                    if (source && source.type === "user_url" && source.url) {
                      return (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-medium no-underline"
                        >
                          [User Source {sourceIndex + 1}]
                        </a>
                      );
                    }
                    return (
                      <span key={i} className="text-primary font-medium">
                        [User Source {sourceIndex + 1}]
                      </span>
                    );
                  }
                  return <span key={i}>[User Source {sourceIndexStr}]</span>;
                }
                return null;
              })}
          </div>

          {/* フィードバックセクション */}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-medium mb-2">
              この回答は役に立ちましたか？
            </h3>

            {data.feedback ? (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">
                  {data.feedback === "good"
                    ? "👍 役に立った"
                    : "👎 役に立たなかった"}
                </p>
                {data.feedbackComment && (
                  <p className="text-sm mt-1">
                    コメント: {data.feedbackComment}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {data.feedbackSubmittedAt &&
                    new Date(data.feedbackSubmittedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className={`flex items-center gap-2 ${submitFeedbackMutation.isLoading && "opacity-50 cursor-not-allowed"}`}
                    onClick={() =>
                      submitFeedbackMutation.mutate({ feedback: "good" })
                    }
                    disabled={submitFeedbackMutation.isLoading}
                  >
                    👍 役に立った
                  </Button>
                  <Button
                    variant="outline"
                    className={`flex items-center gap-2 ${submitFeedbackMutation.isLoading && "opacity-50 cursor-not-allowed"}`}
                    onClick={() =>
                      submitFeedbackMutation.mutate({ feedback: "bad" })
                    }
                    disabled={submitFeedbackMutation.isLoading}
                  >
                    👎 役に立たなかった
                  </Button>
                </div>

                <div>
                  <Label htmlFor="feedback-comment">コメント（任意）</Label>
                  <Textarea
                    id="feedback-comment"
                    placeholder="回答についてのフィードバックをお聞かせください"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="mt-1"
                    disabled={submitFeedbackMutation.isLoading}
                  />
                  <Button
                    className="mt-2"
                    onClick={() =>
                      submitFeedbackMutation.mutate({
                        feedback: "good",
                        comment: feedbackComment,
                      })
                    }
                    disabled={
                      !feedbackComment.trim() ||
                      submitFeedbackMutation.isLoading
                    }
                  >
                    {submitFeedbackMutation.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      "コメントを送信"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {data.userEvidence && data.userEvidence.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">ユーザー提供エビデンス</h2>
          <div className="space-y-6 mb-8">
            {data.userEvidence.map((evidence, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {evidence.title ||
                      (evidence.type === "user_pdf"
                        ? "PDFドキュメント"
                        : "URLコンテンツ")}
                  </CardTitle>
                  <CardDescription>ソース: {evidence.source}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {evidence.content.length > 300
                      ? evidence.content.substring(0, 300) + "..."
                      : evidence.content}
                  </p>
                </CardContent>
                {evidence.url && (
                  <CardFooter>
                    <a
                      href={evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm flex items-center"
                    >
                      ソースへ移動
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {!data.useOnlyUserEvidence && data.citations.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">PubMedソース</h2>
          <div className="space-y-6 mb-8">
            {data.citations.map((citation) => (
              <Card key={citation.pmid}>
                <CardHeader>
                  <CardTitle className="text-lg">{citation.title}</CardTitle>
                  <CardDescription>
                    {citation.authors} • {citation.journal} ({citation.year})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {citation.abstract}
                  </p>
                </CardContent>
                <CardFooter>
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm flex items-center"
                  >
                    PubMedで見る
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      {!data.useOnlyUserEvidence &&
        !data.usePubMedOnly &&
        data.webResults.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4">ウェブソース</h2>
            <div className="space-y-6">
              {data.webResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{result.title}</CardTitle>
                    <CardDescription>ソース: {result.source}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {result.snippet}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm flex items-center"
                    >
                      ソースへ移動
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>追加の質問</CardTitle>
            <CardDescription>
              先ほどの回答に関連する追加質問ができます
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 想定される質問の例 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">想定される質問:</h3>
              <div className="flex flex-col gap-2">
                {generateSuggestedQuestions(data.query).map(
                  (question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-2 px-3"
                      onClick={() => {
                        processMutation.mutate({
                          query: question,
                          maxResults: data?.maxResults || 5,
                          usePubMedOnly: followUpUsePubMedOnly,
                          responseLanguage: data?.responseLanguage || "ja",
                          previousQueryId: id,
                        });
                      }}
                    >
                      {question}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <Separator className="my-4" />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (followUpQuery.trim()) {
                  processMutation.mutate({
                    query: followUpQuery,
                    maxResults: data?.maxResults || 5,
                    usePubMedOnly: followUpUsePubMedOnly,
                    responseLanguage: data?.responseLanguage || "ja",
                    previousQueryId: id,
                  });
                }
              }}
              className="flex flex-col gap-4"
            >
              <div className="relative">
                <Input
                  type="text"
                  placeholder="関連する追加の質問を入力してください"
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  className="w-full"
                  disabled={processMutation.isLoading}
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <Checkbox
                  id="follow-up-use-pubmed-only"
                  checked={followUpUsePubMedOnly}
                  onCheckedChange={(checked) => {
                    setFollowUpUsePubMedOnly(checked === true);
                  }}
                />
                <Label htmlFor="follow-up-use-pubmed-only">
                  PubMed掲載論文のみを使用する
                </Label>
              </div>
              <div className="flex justify-between">
                <Link to="/">
                  <Button variant="outline">新しい検索を開始</Button>
                </Link>
                <Button
                  type="submit"
                  disabled={
                    processMutation.isLoading ||
                    checkTaskStatusMutation.isLoading ||
                    getTaskResultsMutation.isLoading ||
                    taskStatus === "RUNNING" ||
                    !followUpQuery.trim()
                  }
                >
                  {processMutation.isLoading ||
                  checkTaskStatusMutation.isLoading ||
                  getTaskResultsMutation.isLoading ||
                  taskStatus === "RUNNING" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {taskStatus === "RUNNING" ? "検索処理中..." : "検索中..."}
                    </>
                  ) : (
                    <>追加質問を送信</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// History page component
function HistoryPage() {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery(
    ["searchHistory", showFavoritesOnly],
    () => {
      const sessionToken = localStorage.getItem("sessionToken") || undefined;
      return apiClient.getSearchHistory({
        sessionToken,
        favoritesOnly: showFavoritesOnly,
      });
    },
  );

  const toggleFavoriteMutation = useMutation(
    (id: string) => {
      const sessionToken = localStorage.getItem("sessionToken") || undefined;
      return apiClient.toggleFavorite({ id, sessionToken });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["searchHistory"]);
      },
      onError: (error) => {
        toast({
          title: "エラー",
          description: "お気に入り登録の変更に失敗しました",
          variant: "destructive",
        });
      },
    },
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">検索履歴</h1>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-favorites"
            checked={showFavoritesOnly}
            onCheckedChange={(checked) =>
              setShowFavoritesOnly(checked === true)
            }
          />
          <Label htmlFor="show-favorites">お気に入りのみ表示</Label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((item) => (
            <Card key={item.id} className="transition-all hover:border-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Link to={`/results/${item.id}`} className="flex-1">
                    <CardTitle className="text-lg">{item.query}</CardTitle>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavoriteMutation.mutate(item.id);
                    }}
                    className="h-8 w-8 rounded-full"
                    aria-label={
                      item.isFavorite
                        ? "お気に入りから削除"
                        : "お気に入りに追加"
                    }
                  >
                    {item.isFavorite ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 text-yellow-500"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    )}
                  </Button>
                </div>
                <CardDescription>
                  {new Date(item.createdAt).toLocaleDateString()} at{" "}
                  {new Date(item.createdAt).toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={`/results/${item.id}`} className="block">
                  <p className="text-muted-foreground">{item.answerPreview}</p>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>検索履歴がありません</CardTitle>
          </CardHeader>
          <CardContent>
            <p>まだ検索をしていません。</p>
          </CardContent>
          <CardFooter>
            <Link to="/">
              <Button>質問をする</Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// Registration page component
function RegistrationPage() {
  const { userData } = useAuth();
  const [name, setName] = useState(userData?.name || "");
  const [birthDate, setBirthDate] = useState(userData?.birthDate || "");
  const [gender, setGender] = useState(userData?.gender || "");
  const [university, setUniversity] = useState(userData?.university || "");
  const [graduationYear, setGraduationYear] = useState(
    userData?.graduationYear || "",
  );
  const [specialization, setSpecialization] = useState(
    userData?.specialization || "",
  );
  const [email, setEmail] = useState(userData?.email || "");
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const { toast } = useToast();

  const registerMutation = useMutation(apiClient.registerMedicalUser, {
    onSuccess: async (data) => {
      if (data.success) {
        console.log(
          `Registration successful. Session token: ${data.sessionToken?.substring(0, 5)}...`,
        );

        // Save session token to localStorage
        if (data.sessionToken) {
          localStorage.setItem("sessionToken", data.sessionToken);
          console.log("Session token saved to localStorage");
        }

        // Save user data to localStorage
        if (data.userData) {
          localStorage.setItem("userData", JSON.stringify(data.userData));
          console.log("User data saved to localStorage");
        }

        toast({
          title: "登録完了",
          description: data.message,
        });

        // Verify authentication status after registration
        const authStatus = await checkAuth();
        console.log(
          `Auth status after registration: ${authStatus.isAuthenticated ? "Authenticated" : "Not authenticated"}`,
        );

        navigate("/");
      } else {
        console.error("Registration failed:", data.message);
        toast({
          title: "エラー",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "登録中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      name,
      birthDate,
      gender,
      university,
      graduationYear,
      specialization,
      email,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>医師登録</CardTitle>
          <CardDescription>
            メドエビデンスは医師専用のサービスです。以下の情報を入力して登録してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">氏名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">生年月日</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">性別</Label>
              <Select value={gender} onValueChange={setGender} required>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                  <SelectItem value="prefer-not-to-say">回答しない</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="university">卒業大学</Label>
              <Input
                id="university"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder=""
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduationYear">卒業年</Label>
              <Input
                id="graduationYear"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder=""
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">専門分野</Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder=""
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isLoading}
            >
              {registerMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登録中...
                </>
              ) : (
                "登録する"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Version notification component
function VersionNotification() {
  const [show, setShow] = useState(false);

  // Current app version - update this when making significant changes
  const APP_VERSION = "1.1.0";

  useEffect(() => {
    // Get the last seen version from localStorage
    const lastSeenVersion = localStorage.getItem("appVersion");

    // Show notification if the version has changed or if it's the first time
    if (!lastSeenVersion || lastSeenVersion !== APP_VERSION) {
      setShow(true);
      // Save the current version to localStorage
      localStorage.setItem("appVersion", APP_VERSION);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3 flex justify-between items-center">
      <div>
        <span className="font-semibold">アプリが更新されました！</span>
        <span className="ml-2">
          バージョン {APP_VERSION} にアップデートされました。
        </span>
      </div>
      <button
        onClick={() => setShow(false)}
        className="p-1 rounded-full hover:bg-primary-foreground/20"
        aria-label="閉じる"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

// Main App component
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <VersionNotification />
          <Navigation />
          <main className="flex-1">
            <Routes>
              <Route path="/register" element={<RegistrationPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/results/:id"
                element={
                  <ProtectedRoute>
                    <ResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/register" replace />} />
            </Routes>
          </main>
          <footer className="border-t py-6">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>
                メドエビデンスはエビデンスに基づく情報を提供します。医学的アドバイスではありません。
              </p>
              <p className="mt-1">
                &copy; {new Date().getFullYear()} メドエビデンス。NCBI
                E-utilities APIとウェブ検索によって提供。
              </p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}
