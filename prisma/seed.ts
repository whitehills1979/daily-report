import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // パスワードのハッシュ化
  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  // ユーザー作成
  console.log('Creating users...');
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@test.com' },
    update: {},
    create: {
      name: 'テスト営業',
      email: 'sales@test.com',
      password: hashedPassword,
      role: 'sales',
      department: '営業部',
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@test.com' },
    update: {},
    create: {
      name: 'テスト上長',
      email: 'manager@test.com',
      password: hashedPassword,
      role: 'manager',
      department: '営業部',
    },
  });

  console.log(`Created users: ${salesUser.name}, ${managerUser.name}`);

  // 顧客作成
  console.log('Creating customers...');
  const customer1 = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '田中一郎',
      companyName: '株式会社テストA',
      phone: '03-1234-5678',
      email: 'tanaka@test-a.co.jp',
      address: '東京都千代田区丸の内1-1-1',
      notes: 'キーマン：田中様',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: '佐藤花子',
      companyName: '株式会社テストB',
      phone: '03-2345-6789',
      email: 'sato@test-b.co.jp',
      address: '東京都港区六本木1-1-1',
      notes: 'システム導入検討中',
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: '鈴木次郎',
      companyName: '株式会社テストC',
      phone: '03-3456-7890',
      email: 'suzuki@test-c.co.jp',
      address: '東京都渋谷区渋谷1-1-1',
      notes: '既存顧客',
    },
  });

  const customer4 = await prisma.customer.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: '高橋三郎',
      companyName: '株式会社テストD',
      phone: '03-4567-8901',
      email: 'takahashi@test-d.co.jp',
      address: '東京都新宿区新宿1-1-1',
      notes: '新規見込み客',
    },
  });

  console.log(
    `Created customers: ${customer1.companyName}, ${customer2.companyName}, ${customer3.companyName}, ${customer4.companyName}`,
  );

  // 日報作成（5件以上）
  console.log('Creating daily reports...');

  // 日報1: 3日前
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const report1 = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: {
        userId: salesUser.id,
        reportDate: threeDaysAgo,
      },
    },
    update: {},
    create: {
      userId: salesUser.id,
      reportDate: threeDaysAgo,
      problem: '新規顧客のニーズがまだ明確に把握できていない。次回訪問時に詳細をヒアリングする必要がある。',
      plan: '株式会社テストDへの訪問。具体的な課題をヒアリングし、提案資料を作成する。',
      visitRecords: {
        create: [
          {
            customerId: customer1.id,
            visitContent: '月次定例訪問。新製品の紹介と導入状況のヒアリング。',
            visitTime: new Date('1970-01-01T14:00:00Z'),
            durationMinutes: 60,
          },
        ],
      },
    },
  });

  // 日報2: 2日前
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const report2 = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: {
        userId: salesUser.id,
        reportDate: twoDaysAgo,
      },
    },
    update: {},
    create: {
      userId: salesUser.id,
      reportDate: twoDaysAgo,
      problem: '提案資料の作成に時間がかかっている。テンプレートの整備が必要。',
      plan: '提案資料の作成を完了させる。上長にレビューを依頼する。',
      visitRecords: {
        create: [
          {
            customerId: customer2.id,
            visitContent: 'システム導入の進捗確認。導入スケジュールについて調整。',
            visitTime: new Date('1970-01-01T10:00:00Z'),
            durationMinutes: 90,
          },
          {
            customerId: customer3.id,
            visitContent: 'トラブル対応。システムの使い方について説明。',
            visitTime: new Date('1970-01-01T15:00:00Z'),
            durationMinutes: 45,
          },
        ],
      },
    },
  });

  // 日報3: 1日前
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const report3 = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: {
        userId: salesUser.id,
        reportDate: oneDayAgo,
      },
    },
    update: {},
    create: {
      userId: salesUser.id,
      reportDate: oneDayAgo,
      problem: '新規見込み客への提案が予定より遅れている。リソース配分を見直す必要がある。',
      plan: '株式会社テストAのフォローアップ訪問。追加の要望がないか確認する。',
      visitRecords: {
        create: [
          {
            customerId: customer4.id,
            visitContent: '初回訪問。会社概要と事業内容のヒアリング。',
            visitTime: new Date('1970-01-01T13:00:00Z'),
            durationMinutes: 120,
          },
        ],
      },
    },
  });

  // 日報4: 今日
  const today = new Date();

  const report4 = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: {
        userId: salesUser.id,
        reportDate: today,
      },
    },
    update: {},
    create: {
      userId: salesUser.id,
      reportDate: today,
      problem:
        '複数の案件が同時進行しており、優先順位付けに悩んでいる。上長に相談したい。',
      plan: '提案書の最終調整。明日のプレゼンに向けて準備を完了させる。',
      visitRecords: {
        create: [
          {
            customerId: customer1.id,
            visitContent: 'フォローアップ訪問。追加要望のヒアリング。',
            visitTime: new Date('1970-01-01T10:30:00Z'),
            durationMinutes: 60,
          },
          {
            customerId: customer2.id,
            visitContent: 'システム導入の最終確認。契約条件の調整。',
            visitTime: new Date('1970-01-01T14:30:00Z'),
            durationMinutes: 75,
          },
        ],
      },
    },
  });

  // 日報5: 1週間前（上長のコメント付き）
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const report5 = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: {
        userId: salesUser.id,
        reportDate: oneWeekAgo,
      },
    },
    update: {},
    create: {
      userId: salesUser.id,
      reportDate: oneWeekAgo,
      problem: '新規開拓の進捗が遅れている。アプローチ方法を見直す必要がある。',
      plan: '既存顧客へのフォローアップを優先する。',
      visitRecords: {
        create: [
          {
            customerId: customer3.id,
            visitContent: '定期訪問。利用状況の確認と新機能の紹介。',
            visitTime: new Date('1970-01-01T11:00:00Z'),
            durationMinutes: 60,
          },
        ],
      },
    },
  });

  console.log(`Created ${5} daily reports`);

  // 上長からのコメント
  console.log('Creating comments from manager...');

  await prisma.comment.create({
    data: {
      dailyReportId: report5.id,
      userId: managerUser.id,
      commentType: 'problem',
      content:
        '新規開拓については、まずターゲット企業のリストアップから始めましょう。来週、一緒にアプローチ方法を検討しましょう。',
    },
  });

  await prisma.comment.create({
    data: {
      dailyReportId: report5.id,
      userId: managerUser.id,
      commentType: 'plan',
      content:
        '既存顧客のフォローアップは重要です。特に株式会社テストCは追加受注のチャンスがありそうですね。',
    },
  });

  await prisma.comment.create({
    data: {
      dailyReportId: report1.id,
      userId: managerUser.id,
      commentType: 'problem',
      content:
        'ニーズのヒアリングは重要です。SPIN営業の手法を活用してみてください。必要であればロープレしましょう。',
    },
  });

  console.log('Created comments from manager');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
