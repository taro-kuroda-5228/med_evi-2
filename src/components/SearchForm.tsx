import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ControllerRenderProps } from 'react-hook-form';

// 検索フォームのバリデーションスキーマ
const searchFormSchema = z.object({
  query: z
    .string()
    .min(1, '検索クエリを入力してください')
    .max(200, '検索クエリは200文字以内で入力してください'),
  responseLanguage: z.enum(['ja', 'en'], {
    required_error: '応答言語を選択してください',
  }),
});

export type SearchFormValues = z.infer<typeof searchFormSchema>;

interface SearchFormProps {
  onSearch: (values: SearchFormValues) => void;
  isLoading?: boolean;
  defaultValues?: Partial<SearchFormValues>;
}

export function SearchForm({ onSearch, isLoading = false, defaultValues }: SearchFormProps) {
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      query: defaultValues?.query ?? '',
      responseLanguage: defaultValues?.responseLanguage ?? 'ja',
    },
  });

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSearch)} className="space-y-4 sm:space-y-6">
          {/* 検索フォームカード */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 lg:p-8 theme-transition-colors">
            {/* 検索クエリフィールド */}
            <FormField
              control={form.control}
              name="query"
              render={({ field }: { field: ControllerRenderProps<SearchFormValues, 'query'> }) => (
                <FormItem className="space-y-2 sm:space-y-3">
                  <FormLabel className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
                    医学的な質問を入力してください
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="例：糖尿病の最新治療法について、高血圧の食事療法について..."
                        {...field}
                        disabled={isLoading}
                        className="
                          w-full px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-14
                          text-sm sm:text-base border-2 rounded-lg sm:rounded-xl
                          focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                          placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm
                          disabled:bg-gray-50 disabled:cursor-not-allowed
                          dark:bg-gray-700 dark:border-gray-600 dark:text-white
                          dark:placeholder:text-gray-400 dark:focus:border-blue-400
                          theme-transition-colors
                        "
                        maxLength={200}
                      />
                      <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs sm:text-sm flex items-center gap-1">
                    {form.formState.errors.query && (
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    )}
                  </FormMessage>

                  {/* 文字数カウンター */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    {field.value.length}/200文字
                  </div>
                </FormItem>
              )}
            />

            {/* 応答言語選択 */}
            <FormField
              control={form.control}
              name="responseLanguage"
              render={({
                field,
              }: {
                field: ControllerRenderProps<SearchFormValues, 'responseLanguage'>;
              }) => (
                <FormItem className="space-y-2 sm:space-y-3">
                  <FormLabel className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
                    回答言語を選択
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger
                        className="
                        w-full px-4 py-3 sm:py-4 text-sm sm:text-base
                        border-2 rounded-lg sm:rounded-xl
                        focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                        disabled:bg-gray-50 disabled:cursor-not-allowed
                        dark:bg-gray-700 dark:border-gray-600 dark:text-white
                        dark:focus:border-blue-400
                        theme-transition-colors
                      "
                      >
                        <SelectValue placeholder="回答言語を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-lg sm:rounded-xl">
                      <SelectItem value="ja" className="py-2 sm:py-3 text-sm sm:text-base">
                        🇯🇵 日本語
                      </SelectItem>
                      <SelectItem value="en" className="py-2 sm:py-3 text-sm sm:text-base">
                        🇺🇸 English
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs sm:text-sm flex items-center gap-1">
                    {form.formState.errors.responseLanguage && (
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    )}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>

          {/* 検索ボタン */}
          <Button
            type="submit"
            disabled={isLoading || !form.watch('query').trim()}
            className="
              w-full bg-gradient-to-r from-blue-600 to-blue-700
              hover:from-blue-700 hover:to-blue-800
              text-white font-semibold text-sm sm:text-base lg:text-lg
              py-3 sm:py-4 lg:py-5 px-6 rounded-xl sm:rounded-2xl
              shadow-lg hover:shadow-xl
              transition-all duration-200
              flex items-center justify-center gap-2 sm:gap-3
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:transform-none
              focus:ring-4 focus:ring-blue-500/30 focus:outline-none
              transform hover:scale-[1.02] active:scale-[0.98]
              min-h-[48px] sm:min-h-[56px] lg:min-h-[64px]
              dark:from-blue-500 dark:to-blue-600
              dark:hover:from-blue-600 dark:hover:to-blue-700
            "
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>検索中...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>医学的エビデンスを検索</span>
              </>
            )}
          </Button>

          {/* ヒントテキスト */}
          <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>💡 詳細で具体的な質問ほど、より正確な回答が得られます</p>
            <p className="hidden sm:block">最新の医学論文データベースから関連情報を検索します</p>
          </div>
        </form>
      </Form>
    </div>
  );
}
