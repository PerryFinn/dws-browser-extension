import { Download, TriangleAlert, Upload } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEventHandler } from "react";
import { toast, ToastContainer } from "react-toastify";

import { sendToBackground, sendToContentScript } from "@plasmohq/messaging";
import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";

import "react-toastify/dist/ReactToastify.css";
import "@/style.css";

import type { downloadReqBody, downloadResBody } from "@/background/messages/download";
import type { parseXlsxInfo, parsingXLSXReqBody, parsingXLSXResBody } from "@/background/messages/parsingXLSX";
import type { ValidateHikReqBody, ValidateHikResBody } from "@/background/messages/validateHikAccounts";
import { BackgroundBeamsWithCollision } from "@/components/complex-ui/background-beams-with-collision";
import { TextGenerateEffect } from "@/components/complex-ui/text-generate-effect";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, jsonToBase64 } from "@/utils";
import { LoginManager, type TaskResult, type UserPasswordPair } from "@/utils/hikCrypto";

import ControlArea from "./control-area";
import Header from "./header";
import TableList from "./table-list";

const storage = new Storage({ area: "local" });

function IndexPopup() {
  const [enabled] = useStorage<boolean>({ key: "enabled", instance: storage }, false);
  const [isRunningTask, setIsRunningTask, isRunningTaskSetter] = useStorage<boolean>(
    { key: "isRunningTask", instance: storage },
    false
  );
  const [processInfo, setProcessInfo, processInfoSetter] = useStorage<Array<parseXlsxInfo>>(
    { key: "processInfo", instance: storage },
    []
  );
  const [taskResult, setTaskResult, taskResultSetter] = useStorage<TaskResult>(
    { key: "taskResult", instance: storage },
    {
      error: [],
      failed: [],
      success: []
    }
  );
  const [file, setFile] = useState<File | null>(null);
  const uploadId = useId();
  const accountsRef = useRef<Array<UserPasswordPair>>([]);
  const handleFileUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target?.files?.[0];
    if (file) {
      const fr = new FileReader();
      fr.onload = async (e) => {
        const ab = e.target.result as ArrayBuffer;
        const data = Array.from(new Uint8Array(ab));
        const {
          success,
          data: excelList,
          message
        } = await sendToBackground<parsingXLSXReqBody, parsingXLSXResBody>({
          name: "parsingXLSX",
          body: { data }
        });
        if (success) {
          toast.success(`${file.name}解析成功`, { autoClose: 500 });
          setProcessInfo(excelList);
          accountsRef.current = excelList.map((item) => {
            return {
              username: item.username,
              passwords: item.password.split("/"),
              host: item.host
            };
          });
          await processInfoSetter.setStoreValue(excelList);
        } else {
          toast.error(`${file.name}解析失败: ${message}`);
        }
      };
      file && fr.readAsArrayBuffer(file);
      setFile(file);
    }
  };

  const successList = useMemo(() => {
    return taskResult.success.map((item) => {
      const target = processInfo.find((originItem) => originItem.host === item.host);
      return { ...item, name: target?.name };
    });
  }, [taskResult, processInfo]);

  const errorList = useMemo(() => {
    return taskResult.error.map((item) => {
      const target = processInfo.find((originItem) => originItem.host === item.host);
      return { ...item, name: target?.name, message: item.message };
    });
  }, [taskResult, processInfo]);

  const failedList = useMemo(() => {
    return taskResult.failed.map((item) => {
      const target = processInfo.find((originItem) => originItem.host === item.host);
      return { ...item, name: target?.name };
    });
  }, [taskResult, processInfo]);

  const handleStart = async () => {
    try {
      await Promise.all([setIsRunningTask(true), isRunningTaskSetter.setStoreValue(true)]);
      const resp = await sendToBackground<ValidateHikReqBody, ValidateHikResBody>({
        name: "validateHikAccounts",
        body: { accounts: accountsRef.current }
      });
      const { success, processInfo: taskResult, error } = resp;
      if (!success) {
        console.error("error :>> ", error);
        toast.error("验证失败: " + error);
        return;
      }
      setTaskResult(taskResult);
      await taskResultSetter.setStoreValue(taskResult);
    } finally {
      setIsRunningTask(false);
      await isRunningTaskSetter.setStoreValue(false);
    }
  };

  const handleExportJSON = async () => {
    const cloneTaskResult = structuredClone(taskResult);
    Object.keys(cloneTaskResult).forEach((key) => {
      cloneTaskResult[key] = cloneTaskResult[key].map((item) => {
        const target = processInfo.find((originItem) => originItem.host === item.host);
        return { ...item, name: target?.name };
      });
    });
    sendToBackground<downloadReqBody, downloadResBody>({
      name: "download",
      body: {
        url: `data:application/json;base64,${jsonToBase64(cloneTaskResult)}`,
        filename: "filterAccounts.json",
        saveAs: true
      }
    });
  };

  const isDisableStart = !enabled || isRunningTask || processInfo.length === 0 || !file;
  const isDisableExport = !enabled || isRunningTask;
  const coastTime = (processInfo.length * LoginManager.delay + 2000) / 1000;

  return (
    // <BackgroundBeamsWithCollision>
    <div className="w-[400px] p-4 space-y-4">
      <Header />
      <ControlArea
        storage={storage}
        onReset={() => {
          setFile(null);
        }}
      />

      <div>
        <Input
          disabled={!enabled}
          type="file"
          accept=".xlsx"
          // accept='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          onChange={handleFileUpload}
          className="hidden"
          id={uploadId}
        />
        <Label htmlFor={uploadId} className="cursor-pointer">
          <div
            className={cn("flex items-center justify-center p-2 border-2 border-dashed rounded-md", {
              "cursor-not-allowed": !enabled
            })}>
            <Upload className="mr-2" />
            <span>{file ? file.name : "导入 XLSX 文件"}</span>
          </div>
        </Label>
      </div>

      <div className="flex justify-center items-center gap-2">
        <Button loading={isRunningTask} disabled={isDisableStart} onClick={handleStart}>
          {isRunningTask ? (
            <TextGenerateEffect
              className="text-sm font-medium text-primary-foreground"
              words={`预计耗时${coastTime}s`}
            />
          ) : (
            "开始调试"
          )}
        </Button>
        {!file && (
          <span className="flex text-red-500 justify-center items-center">
            <TriangleAlert />
            请先导入 .xlsx <span className="text-xl">☝️</span>
          </span>
        )}
      </div>

      <div>
        <TableList
          totalList={errorList}
          type="error"
          title="ErrorTable"
          subTitle="存在问题无法验证的列表，需要着重关注"
        />
      </div>
      <Divider className="divider-neutral">分割线</Divider>
      <div>
        <TableList totalList={successList} title="SuccessTable" subTitle="验证成功的一组账号密码" />
      </div>

      <Button disabled={isDisableExport} onClick={handleExportJSON} className="w-full">
        <Download className="mr-2 h-4 w-4" />
        导出为 JSON
      </Button>

      <ToastContainer position="bottom-center" autoClose={2000} />
    </div>
    // </BackgroundBeamsWithCollision>
  );
}

export default IndexPopup;
