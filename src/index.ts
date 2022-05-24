import 'colors'
import {ver} from './util'
import {run as findRun} from './cmd-find'
import {run as jsRun} from './cmd-js'
import {run as manifestRun} from './cmd-manifest'
import {run as packRun} from './cmd-pack'
import {run as dbRun} from './cmd-db'
import {run as libRun} from './cmd-lib'
import {run as keyRun} from './cmd-key'
import {Command} from 'commander'


const program = new Command()

program
  .command('find')
  .description('搜索公共资源')
  .option('-f, --filter [glob]',    '路径匹配', '**')
  .option('-s, --save [file]',      '保存清单，默认使用 freecdn-manifest.txt')
  .option('--with-urls <file>',     '外部 URL 列表文件')
  .option('--hosts <hosts>',        '选择指定站点的资源\n' +
                                    '多个站点使用空白符分隔，`*` 可匹配子域名')
  .option('-u, --show-unmatched',   '显示无法搜索到文件')
  .action(findRun)

program
  .command('js')
  .description('维护前端文件')
  .option('-m, --make',             '创建前端资源')
  .option('--cdn <urls>',           '指定主脚本从哪些 URL 加载，使用空白符分隔\n' +
                                    '内置值：jsdelivr, unpkg, elemecdn\n' +
                                    '默认使用所有内置 CDN。参数为 none 则不使用外部 URL')
  .option('--setup-sw <file>',      '共享接入模式。插入代码到已有的 Service Worker 文件')
  .option('--dev',                  '开发模式。前端文件使用调试版本')
  .option('-v, --version',          '查看 JS 版本')
  .action(jsRun)

program
  .command('manifest')
  .description('清单文件操作')
  .option('-i, --input [file]',     '输入清单', 'freecdn-manifest.txt')
  .option('-o, --output [file]',    '输出清单。默认和输入清单相同')
  .option('-m, --merge <file>',     '将指定的清单合并到输入清单，保存到输出清单')
  .option('-s, --sign',             '对输入清单进行签名，保存到输出清单')
  .option('--verify-sign',          '校验输入清单的签名')
  .action(manifestRun)

program
  .command('pack')
  .description('资源打包')
  .option('-i, --input <path>',     '需打包的目录')
  .option('-f, --filter <glob>',    '需过滤的文件，使用 glob 匹配', '**')
  .option('-o, --output <file>',    '保存路径')
  .option('--headers <json>',       '配置 HTTP 响应头，使用 JSON 字符串或文件路径')
  .option('--no-img-upgrade',       '排除图片文件对应的 webp/avif 版本')
  .option('-l, --list <file>',      '显示资源包内容')
  .action(packRun)

program
  .command('db')
  .description('维护数据库')
  .option('-l, --list',             '查看所有记录')
  .option('--list-host <hosts>',    '查看指定站点的记录。多个值使用空白符分隔，下同')
  .option('--list-hash <hashes>',   '查看指定 Hash 的记录\n')
  .option('--list-url <urls>',      '查看指定 URL 的记录\n' +
                                    '----')
  .option('-c, --count',            '统计所有记录数')
  .option('--count-host <hosts>',   '统计指定站点的记录数')
  .option('--count-hash <hashes>',  '统计指定 Hash 的记录数')
  .option('--count-url <urls>',     '统计指定 URL 的记录数\n' +
                                    '----')
  .option('--del-host <hosts>',     '删除指定站点的记录')
  .option('--del-hash <hashes>',    '删除指定 Hash 的记录')
  .option('--del-url <urls>',       '删除指定 URL 的记录')
  .option('--del-all',              '删除所有记录\n' +
                                    '----')
  .option('-w, --wildcard',         '开启通配模式，`*` 可匹配任意数量的字符。例如：\n' +
                                    'freecdn db --list-url "*.gif *.png" -w\n' +
                                    '执行 --list-host、--count-host、--del-host 时自动开启')
  .option('-i, --import',           '导入记录，从 stdin 读取。例如：\n' +
                                    'freecdn db -i <<< "\n' +
                                    'SnVzdCBSZWFkIHRoZSBJbnN0cnVjdGlvbnMgKl5fXio= https://foo/1.gif\n' +
                                    'T2YgQ291cnNlIEkgU3RpbGwgTG92ZSBZb3UgQC1fLUA= https://bar/2.png"')
  .option('-s, --sql <sql>',        '执行 SQL。例如：\n' +
                                    'freecdn db -s "SELECT hash, COUNT(1) FROM table_urls GROUP BY hash"')
  .action(dbRun)

program
  .command('lib')
  .description('查看公共库')
  .option('-l, --list',             '查看所有记录。字段使用 Tab 分隔')
  .option('-q, --query <hashes>',   '查询 Hash 对应的 URL，多个值使用空白符分隔。例如：\n' +
                                    'freecdn lib --query "\n' +
                                    'qRgUkISo5k/bgIWNHGfLsC8WmasnE7jYdCZvthIFLno=\n' +
                                    'DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE="')
  .action(libRun)

program
  .command('key')
  .description('维护密钥')
  .option('-p, --public',           '查看公钥')
  .option('-s, --private',          '查看私钥')
  .option('-u, --update',           '更新密钥')
  .action(keyRun)

program
  .version(ver)

program
  .parse(process.argv)