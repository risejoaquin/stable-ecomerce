import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');

// Replace direct useQuery with useAdminOrders
const oldQueryRegex = /const \{ data: orders, isLoading \} = useQuery\(\{\n\s*queryKey: \['admin-orders'\],\n\s*queryFn: \(\) => apiClient\.get\('\/admin\/orders'\),\n\s*refetchInterval: 5000\n\s*\}\);/;
const newQuery = `
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = useAdminOrders({ status: filterStatus, page, pageSize: 20 });
  const orders = response?.data || [];
  const totalPages = response ? Math.ceil(response.total / response.pageSize) : 1;
`;

if (code.match(oldQueryRegex)) {
  code = code.replace(oldQueryRegex, newQuery.trim());
}

// Reset page when filter changes
code = code.replace(
  "onClick={() => setFilterStatus(status)}",
  "onClick={() => { setFilterStatus(status); setPage(1); }}"
);

// We need to add pagination controls
const tableEndRegex = /<\/tbody>\n\s*<\/table>\n\s*<\/div>\n\s*<\/div>/;
const paginationHtml = `
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <span className="px-3 py-1">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
`;
code = code.replace(tableEndRegex, paginationHtml.trim());

// Local filtering is no longer needed
const localFilteringRegex = /const filteredOrders = useMemo\(\(\) => \{[\s\S]*?\}, \[orders, filterStatus\]\);/;
code = code.replace(localFilteringRegex, "const filteredOrders = orders;");

// Update previousOrderCount logic to use response?.total instead of orders.length
code = code.replace(/if \(orders && previousOrderCount !== null && orders\.length > previousOrderCount\) \{/g, "if (response && previousOrderCount !== null && response.total > previousOrderCount) {");
code = code.replace(/setPreviousOrderCount\(orders\.length\);/g, "setPreviousOrderCount(response.total);");

fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
