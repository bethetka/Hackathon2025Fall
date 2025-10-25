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
import * as z from "zod/v4/core";

interface ZodFieldEditorProps {
  propName: string;
  schema: z.JSONSchema.JSONSchema;
  value: any | undefined;
  setValue: (value: any) => void;
}

export const ZodFieldEditor: React.FC<ZodFieldEditorProps> = ({
  propName,
  schema,
  value,
  setValue
}) => {
  if (schema.enum && schema.enum.length > 0) {
    return (
      <div className="space-y-2">
        <Label htmlFor={propName}>{schema.title || propName}</Label>
        <Select 
          value={value !== undefined ? String(value) : undefined} 
          onValueChange={setValue}
        >
          <SelectTrigger id={propName}>
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
        />
        <Label htmlFor={propName} className="font-normal">
          {schema.title || propName}
        </Label>
      </div>
    );
  }

  if (schema.type === "string") {
    let inputType = "text";
    let component = <Input />;
    
    if (schema.format === "date") {
      inputType = "date";
    } else if (schema.format === "email") {
      inputType = "email";
    } else if (schema.format === "uri") {
      inputType = "url";
    } else if (schema.maxLength && schema.maxLength > 100) {
      component = <Textarea rows={4} />;
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={propName}>{schema.title || propName}</Label>
        {component === <Textarea /> ? (
          <Textarea
            id={propName}
            value={value || ""}
            onChange={(e) => setValue(e.target.value)}
            placeholder={schema.description}
          />
        ) : (
          <Input
            id={propName}
            type={inputType}
            value={value || ""}
            onChange={(e) => setValue(e.target.value)}
            placeholder={schema.description}
          />
        )}
      </div>
    );
  }

  if (schema.type === "number" || schema.type === "integer") {
    return (
      <div className="space-y-2">
        <Label htmlFor={propName}>{schema.title || propName}</Label>
        <Input
          id={propName}
          type="number"
          value={value !== undefined ? value : ""}
          onChange={(e) => 
            setValue(e.target.value ? Number(e.target.value) : undefined)
          }
          step={schema.type === "integer" ? 1 : 0.1}
          placeholder={schema.description}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={propName}>{schema.title || propName}</Label>
      <Input
        id={propName}
        type="text"
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => setValue(e.target.value)}
        placeholder={schema.description}
      />
    </div>
  );
};
