set shell := ["bash", "-c"]

# 全量验证：lint + 单测 + 入口自检
verify: lint test
    @node bin/cli.js --help > /dev/null && echo "✅ verify 全部通过（lint + test + 入口自检）"

lint:
    bun run lint

test:
    node --test tests/*.test.js
