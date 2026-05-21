#!/usr/bin/env python3
import re

# Read the file
with open('app/purchase-orders/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Print button line
content = re.sub(
    r'\s*<button onClick=\{\(\) => window\.print\(\)}[^\n]*<Printer size=\{16\} \/><\/button>\n',
    '',
    content
)

# Remove the Download/Export button line
content = re.sub(
    r'\s*<button onClick=\{\(\) => window\.print\(\)}[^\n]*<FileDown size=\{16\} \/><\/button>\n',
    '',
    content
)

# Write the file back
with open('app/purchase-orders/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully removed Print and Download buttons from PO Register")
