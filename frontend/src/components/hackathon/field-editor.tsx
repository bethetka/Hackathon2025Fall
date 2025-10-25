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
import { AlertCircle, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";

interface ZodFieldEditorProps {
  propName: string;
  schema: z.JSONSchema.JSONSchema;
  value: any | undefined;
  setValue: (value: any) => void;
  error?: z.$ZodIssue | null;
  suggestions?: string[];
}

const getDefaultValueForSchema = (schema: z.JSONSchema.JSONSchema) => {
  if (schema.type === "string") return "";
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return false;
  if (schema.type === "array") return [];
  if (schema.type === "object") {
    if (schema.additionalProperties) {
      return {};
    }
    if (schema.properties) {
      const defaults: Record<string, any> = {};
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        defaults[key] = getDefaultValueForSchema(propSchema as z.JSONSchema.JSONSchema);
      });
      return defaults;
    }
    return {};
  }
  return undefined;
};

export const ZodFieldEditor: React.FC<ZodFieldEditorProps> = ({
  propName,
  schema,
  value,
  setValue,
  error,
  suggestions
}) => {
  const isPasswordField = schema.description?.includes("format:password") || false;
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(() => {
    if (typeof value === "string") return value;
    if (value === undefined || value === null) return "";
    return String(value);
  });

  const [tempRecordKeys, setTempRecordKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    setTempRecordKeys(prev => {
      const next = { ...prev };
      Object.keys(prev).forEach(key => {
        if (!(key in (value || {}))) {
          delete next[key];
        }
      });
      return next;
    });
  }, [value]);

  useEffect(() => {
    if (schema.type === "string") {
      if (typeof value === "string") {
        setInternalValue(value);
      } else if (value === undefined || value === null) {
        setInternalValue("");
      } else {
        setInternalValue(String(value));
      }
    }
  }, [value, schema.type]);

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

  const handleInputValue = (newValue: string) => {
    setInternalValue(newValue);

    if (schema.type === "number" || schema.type === "integer") {
      if (newValue === "") {
        setValue(undefined);
      } else {
        setValue(schema.type === "integer" ? parseInt(newValue, 10) : parseFloat(newValue));
      }
    } else if (schema.type === "string") {
      setValue(newValue);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputValue(e.target.value);
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
    const uniqueSuggestions = useMemo(
      () => (suggestions ? Array.from(new Set(suggestions.filter(option => option.trim().length > 0))) : []),
      [suggestions]
    );
    const filteredSuggestions = useMemo(() => {
      if (!uniqueSuggestions.length) return [];
      if (!internalValue) return uniqueSuggestions;
      const lower = internalValue.toLowerCase();
      return uniqueSuggestions.filter(option => option.toLowerCase().includes(lower));
    }, [uniqueSuggestions, internalValue]);
    const shouldShowSuggestions = isFocused && filteredSuggestions.length > 0;

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
            value={internalValue ?? ""}
            onChange={(e) => handleInputValue(e.target.value)}
            rows={4}
            placeholder={schema.description}
            className={error ? "border-red-500" : ""}
          />
        ) : (
          <div className="relative w-full">
            <Input
              id={propName}
              type={inputType}
              value={internalValue ?? ""}
              onChange={handleInputChange}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                setTimeout(() => setIsFocused(false), 120);
              }}
              placeholder={schema.description}
              className={error ? "border-red-500" : ""}
              autoComplete="off"
            />
            {shouldShowSuggestions && (
              <div className="absolute z-20 mt-2 w-full rounded-md border bg-popover shadow-md">
                <Command>
                  <CommandList>
                    <CommandEmpty>No matches found.</CommandEmpty>
                    <CommandGroup>
                      {filteredSuggestions.map(option => (
                        <CommandItem
                          key={`${propName}-${option}`}
                          value={option}
                          onSelect={(val) => {
                            handleInputValue(val);
                            setIsFocused(false);
                          }}
                        >
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
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

  if (schema.type === "object" && schema.properties) {
    return (
      <div className="space-y-2 border rounded-lg p-4 bg-card">
        <div className="flex justify-between items-center mb-3">
          <Label className={error ? "text-red-500 font-medium" : "font-medium"}>
            {schema.title || propName}
          </Label>
          {schema.description && (
            <span className="text-xs text-muted-foreground">
              {schema.description}
            </span>
          )}
        </div>

        <div className="pl-2 space-y-4 border-l-2 border-border">
          {Object.entries(schema.properties).map(([key, propSchema]) => (
            <div key={key} className="pl-4">
              <ZodFieldEditor
                propName={key}
                schema={propSchema as z.JSONSchema.JSONSchema}
                value={value ? value[key] : undefined}
                setValue={(newValue) => {
                  setValue({
                    ...(value || {}),
                    [key]: newValue
                  });
                }}
                error={error}
              />
            </div>
          ))}
        </div>
        {renderError()}
      </div>
    );
  }

  if (schema.type === "array") {
    const itemSchema = schema.items as z.JSONSchema.JSONSchema;

    return (
      <div className="space-y-2">
        <Label htmlFor={propName} className={error ? "text-red-500" : ""}>
          {schema.title || propName}
        </Label>
        <div className="space-y-2">
          {(value || []).map((item: any, index: number) => (
            <div key={index} className="border p-3 rounded-md bg-muted/30 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-sm"
                onClick={() => {
                  const newArray = [...(value || [])];
                  newArray.splice(index, 1);
                  setValue(newArray);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
              <ZodFieldEditor
                propName={`${propName}[${index}]`}
                schema={itemSchema}
                value={item}
                setValue={(newValue) => {
                  const newArray = [...(value || [])];
                  newArray[index] = newValue;
                  setValue(newArray);
                }}
                error={error}
                suggestions={suggestions}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              let newItem;
              if (itemSchema.type === "object") {
                newItem = {};
              } else if (itemSchema.type === "array") {
                newItem = [];
              } else {
                newItem = itemSchema.type === "string" ? "" :
                  itemSchema.type === "number" || itemSchema.type === "integer" ? 0 :
                    itemSchema.type === "boolean" ? false : undefined;
              }
              setValue([...(value || []), newItem]);
            }}
          >
            + Add {schema.title || "Item"}
          </Button>
        </div>
        {renderError()}
      </div>
    );
  }

  if (schema.type === "object" && schema.additionalProperties) {
    const valueSchema = schema.additionalProperties as z.JSONSchema.JSONSchema;
    const currentValue = value && typeof value === 'object' ? value : {};

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className={error ? "text-red-500 font-medium" : "font-medium"}>
            {schema.title || propName}
          </Label>
          {schema.description && (
            <span className="text-xs text-muted-foreground">
              {schema.description}
            </span>
          )}
        </div>

        <div className="space-y-2 pl-2">
          {Object.entries(currentValue).map(([key, val], index) => (
            <div
              key={key}
              className="flex items-start gap-2 p-3 bg-muted/30 rounded border relative"
            >
              <div className="absolute -top-2 left-3 px-1.5 bg-background text-xs text-muted-foreground">
                Entry {index + 1}
              </div>

              <div className="flex-1 grid grid-cols-[1fr,3fr] gap-2">
                <div>
                  <Label
                    htmlFor={`${propName}-key-${index}`}
                    className="text-xs font-normal mb-1 block"
                  >
                    Key
                  </Label>
                  <Input
                    id={`${propName}-key-${index}`}
                    value={tempRecordKeys[key] ?? key}
                    onChange={(e) => {
                      const newTempKey = e.target.value;
                      setTempRecordKeys(prev => ({
                        ...prev,
                        [key]: newTempKey
                      }));
                    }}
                    onBlur={() => {
                      const tempKey = tempRecordKeys[key] ?? key;
                      if (tempKey !== key && tempKey !== '') {
                        const current = value && typeof value === 'object' ? value : {};
                        const newValue = { ...current };
                        delete newValue[key];
                        newValue[tempKey] = val;
                        setValue(newValue);
                      }
                      setTempRecordKeys(prev => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      });
                    }}
                    placeholder="Property name"
                    className="text-sm h-8"
                  />
                </div>

                <div>
                  <Label
                    htmlFor={`${propName}-value-${index}`}
                    className="text-xs font-normal mb-1 block"
                  >
                    Value
                  </Label>
                  <ZodFieldEditor
                    propName={`${propName}.${key}`}
                    schema={valueSchema}
                    value={val}
                    setValue={(newVal) => {
                      const current = value && typeof value === 'object' ? value : {};
                      setValue({
                        ...current,
                        [key]: newVal
                      });
                    }}
                    error={error}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const current = value && typeof value === 'object' ? value : {};
                  const newValue = { ...current };
                  delete newValue[key];
                  setValue(newValue);

                  setTempRecordKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={() => {
              const current = value && typeof value === 'object' ? value : {};
              const newKey = `key${Object.keys(current).length + 1}`;
              setValue({
                ...current,
                [newKey]: getDefaultValueForSchema(valueSchema)
              });
            }}
          >
            + Add Entry
          </Button>
        </div>
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
