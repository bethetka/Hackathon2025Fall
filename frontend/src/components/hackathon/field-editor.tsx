import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import * as z from "zod/v4/core";
import { AlertCircle } from "lucide-react";
import React from "react";

interface ZodFieldEditorProps {
  propName: string;
  schema: z.JSONSchema.JSONSchema;
  value: any | undefined;
  setValue: (value: any) => void;
  error?: z.$ZodIssue | null;
}

export const ZodFieldEditor: React.FC<ZodFieldEditorProps> = ({
  propName,
  schema,
  value,
  setValue,
  error
}) => {
  const isPasswordField = schema.description?.includes("format:password") || false;
  const [showPassword, setShowPassword] = React.useState(false);
  
  const renderError = () => {
    if (error) {
      return (
        <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
          <AlertCircle className="h-3 w-3" />
          <span>{error.message}</span>
        </div>
      );
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (schema.type === "number" || schema.type === "integer") {
      if (newValue === "") {
        setValue(undefined);
      } else {
        setValue(schema.type === "integer" ? parseInt(newValue, 10) : parseFloat(newValue));
      }
    } else {
      setValue(newValue);
    }
  };

  if (isPasswordField) {
    return (
      <div className="space-y-2">
        <Label 
          htmlFor={propName} 
          className={`flex justify-between items-center ${error ? "text-red-500" : ""}`}
        >
          <span>{schema.title || propName}</span>
          <span className="text-xs text-gray-500">8+ characters recommended</span>
        </Label>
        <div className="relative">
          <Input
            id={propName}
            type={showPassword ? "text" : "password"}
            value={value ?? ""}
            onChange={handleInputChange}
            placeholder={schema.description?.includes("format:password") ? "" : schema.description}
            className={`${error ? "border-red-500 pr-10" : "pr-10"}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
        {renderError()}
      </div>
    );
  }

  if (schema.enum && schema.enum.length > 0) {
    return (
      <div className="space-y-2">
        <Label htmlFor={propName} className={error ? "text-red-500" : ""}>
          {schema.title || propName}
        </Label>
        <Select 
          value={value !== undefined ? String(value) : undefined} 
          onValueChange={setValue}
        >
          <SelectTrigger id={propName} className={error ? "border-red-500" : ""}>
            <SelectValue placeholder={`Select ${propName}`} />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((option, index) => (
              <SelectItem 
                key={`${propName}-enum-${index}`} 
                value={String(option)}
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {renderError()}
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <div className="flex items-center space-x-2 pt-1">
        <Checkbox
          id={propName}
          checked={Boolean(value)}
          onCheckedChange={setValue}
          className={error ? "border-red-500" : ""}
        />
        <Label 
          htmlFor={propName} 
          className={`font-normal ${error ? "text-red-500" : ""}`}
        >
          {schema.title || propName}
        </Label>
        {error && <AlertCircle className="h-4 w-4 text-red-500 ml-1" />}
      </div>
    );
  }

  const isTextarea = schema.maxLength && schema.maxLength > 100;
  
  if (schema.type === "string") {
    let inputType = "text";
    
    if (schema.format === "date") {
      inputType = "date";
    } else if (schema.format === "email") {
      inputType = "email";
    } else if (schema.format === "uri") {
      inputType = "url";
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={propName} className={error ? "text-red-500" : ""}>
          {schema.title || propName}
        </Label>
        {isTextarea ? (
          <Textarea
            id={propName}
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder={schema.description}
            className={error ? "border-red-500" : ""}
          />
        ) : (
          <Input
            id={propName}
            type={inputType}
            value={value ?? ""}
            onChange={handleInputChange}
            placeholder={schema.description}
            className={error ? "border-red-500" : ""}
          />
        )}
        {renderError()}
      </div>
    );
  }

  if (schema.type === "number" || schema.type === "integer") {
    return (
      <div className="space-y-2">
        <Label htmlFor={propName} className={error ? "text-red-500" : ""}>
          {schema.title || propName}
        </Label>
        <Input
          id={propName}
          type="number"
          value={value !== undefined ? value : ""}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue === "") {
              setValue(undefined);
            } else {
              setValue(schema.type === "integer" ? parseInt(newValue, 10) : parseFloat(newValue));
            }
          }}
          step={schema.type === "integer" ? 1 : 0.1}
          placeholder={schema.description}
          className={error ? "border-red-500" : ""}
        />
        {renderError()}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={propName} className={error ? "text-red-500" : ""}>
        {schema.title || propName}
      </Label>
      <Input
        id={propName}
        type="text"
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value)}
        placeholder={schema.description}
        className={error ? "border-red-500" : ""}
      />
      {renderError()}
    </div>
  );
};