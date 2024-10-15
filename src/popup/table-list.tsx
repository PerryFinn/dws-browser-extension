import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import React, { useState, type ReactNode } from "react";
import { toast } from "react-toastify";

import type { parseXlsxInfo } from "@/background/messages/parsingXLSX";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils";

interface IProps {
  totalList: Array<Partial<parseXlsxInfo & { message: string }>>;
  title?: ReactNode;
  subTitle?: ReactNode;
  type?: "normal" | "error";
}

function TableList({ totalList: dataList = [], title = "SuccessTable", type = "normal", subTitle }: IProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} 已复制到剪贴板`);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error(`复制 ${type} 失败`);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dataList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(dataList.length / itemsPerPage);

  const isError = type === "error";
  const stripeColor = isError ? "bg-red-100 hover:bg-red-300" : "bg-gray-100 hover:bg-gray-300";

  return (
    <div>
      <h3 className={cn("font-semibold text-xl", { "text-red-500": isError, "mb-2": !subTitle })}>{title}</h3>
      <span className="flex gap-1 before:block before:w-1 before:h-auto before:bg-slate-300">{subTitle}</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-1">序</TableHead>
            {/* <TableHead className="px-1">name</TableHead> */}
            <TableHead className="px-1">host</TableHead>
            {isError && <TableHead className="px-1">原因</TableHead>}
            <TableHead className="px-1">账号</TableHead>
            <TableHead className="px-1">密码</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((account, index) => {
            const name = account.name || "--";
            const host = account.host || "--";
            const message = account.message || "--";
            const username = account.username || "--";
            const password = account.password || "--";

            return (
              <TableRow key={index} className={cn({ [`${stripeColor}`]: index % 2 === 0 })}>
                <TableCell className="p-1.5">
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[20px]">{index + 1}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{index + 1}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                {/* <TableCell className="p-1.5">
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[70px]">{name}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell> */}
                <TableCell className="p-1.5">
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[110px]">{host}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{host}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <button
                      onClick={() => copyToClipboard(host, "host")}
                      className="flex-shrink-0"
                      aria-label="Copy host">
                      <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                </TableCell>
                {isError && (
                  <TableCell className="p-1.5">
                    <div className="flex items-center space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate max-w-[110px]">{message}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{message}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                )}
                <TableCell className="p-1.5">
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[70px]">{username}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{username}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <button
                      onClick={() => copyToClipboard(username, "Username")}
                      className="flex-shrink-0"
                      aria-label="Copy username">
                      <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="p-1.5">
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[70px]">{password}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{password}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <button
                      onClick={() => copyToClipboard(password, "Password")}
                      className="flex-shrink-0"
                      aria-label="Copy password">
                      <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between mt-4">
        <Button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default TableList;
