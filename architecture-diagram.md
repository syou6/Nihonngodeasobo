# English AI Diary システムアーキテクチャ

```mermaid
graph TB
    subgraph "フロントエンド"
        A[React App<br/>PWA対応]
        B[音声録音<br/>Web Speech API]
        C[家族共有UI<br/>リアルタイム更新]
    end

    subgraph "認証・データベース"
        D[Supabase Auth<br/>Google OAuth対応]
        E[Supabase Database<br/>PostgreSQL]
        F[Supabase Storage<br/>音声ファイル保存]
    end

    subgraph "AI・分析"
        G[Google Gemini AI<br/>感情・健康分析]
        H[音声認識<br/>文字起こし]
    end

    subgraph "通知・決済"
        I[Firebase Cloud Messaging<br/>プッシュ通知]
        J[Stripe<br/>決済処理]
    end

    subgraph "デプロイ・ホスティング"
        K[Vercel<br/>フロントエンドホスティング]
        L[Supabase Edge Functions<br/>サーバーレスAPI]
    end

    A --> D
    A --> E
    A --> F
    B --> H
    H --> G
    G --> E
    E --> I
    E --> J
    A --> K
    L --> E
    L --> I
    L --> J

    style A fill:#e1f5fe
    style G fill:#f3e5f5
    style I fill:#e8f5e8
    style J fill:#fff3e0
```

## アーキテクチャの特徴

### フロントエンド

- **React + TypeScript**: 型安全な開発
- **PWA 対応**: オフライン利用可能
- **レスポンシブデザイン**: 高齢者に優しい UI

### バックエンド

- **Supabase**: 認証・データベース・ストレージ
- **Edge Functions**: サーバーレス API
- **リアルタイム同期**: 家族間の即座な情報共有

### AI・分析

- **Google Gemini AI**: 感情・健康状態分析
- **Web Speech API**: 音声認識・文字起こし
- **自動分析**: 日記内容の感情スコア算出

### 通知・決済

- **Firebase FCM**: プッシュ通知
- **Stripe**: 安全な決済処理
- **自動課金**: サブスクリプション管理
