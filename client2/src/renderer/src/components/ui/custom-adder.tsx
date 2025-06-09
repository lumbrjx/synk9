"use client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { PlusCircle, Trash2 } from "lucide-react"
import { Input } from "./input"

// Define the Rule type
export type Rule = {
  sensor_id: string
  expectedValue?: string
  register?: string
}

// Define type for sensor options
export type SensorOption = {
  value: string
  label: string
  register?: string
}

type RulesInputProps = {
  double?: boolean
  withVal?: boolean
  value: Rule[]
  onChange: (rules: Rule[]) => void
  sensorOptions: SensorOption[]  // Available sensors for selection
  className?: string
}

export const RulesInput = ({
  double = false,
  withVal = false,
  value = [],
  onChange,
  sensorOptions = [],
  className
}: RulesInputProps) => {
  // Add a new empty rule
  const addRule = () => {
    const newRules = [...value, { sensor_id: "", expectedValue: "", register: '' }]
    onChange(newRules)
  }

  // Remove a rule at specific index
  const removeRule = (index: number) => {
    const newRules = [...value]
    newRules.splice(index, 1)
    onChange(newRules)
  }

  // Update a rule's sensorId at specific index
  const updateSensorId = (index: number, newSensorId: string, register?: string) => {
    const newRules = [...value]
    newRules[index] = { ...newRules[index], sensor_id: newSensorId, register: register}
    onChange(newRules)
  }
  const updateRuleValue = (index: number, newRule: string) => {

    const newRules = [...value]
    newRules[index] = { ...newRules[index], expectedValue: newRule }
    onChange(newRules)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Container with fixed height and overflow handling */}
      <div className="border border-purple-100/20 rounded-md ">
        {/* This is the scrollable container */}
        <div className="max-h-40 overflow-y-auto p-2">
          {value.length > 0 ? (
            <div className="space-y-2">
              {value.map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-full flex flex-row gap-2 min-w-0">
                    {/* Select dropdown for sensorId */}
                    {double === false && <Select
                      value={rule.sensor_id}
                      onValueChange={(newValue) => updateSensorId(index, newValue, rule.register)}
                    >
                      <SelectTrigger className="text-purple-100 w-full truncate">
                        <SelectValue placeholder="Select sensor" />
                      </SelectTrigger>
                      <SelectContent>
                        {sensorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                            {option.register}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>}
                    {double === true && <Input
                      value={rule.sensor_id}
                      onChange={(e) => updateSensorId(index, e.target.value, rule.register)}
                      placeholder="MemoryAddress"
                      className="text-purple-100"
                    />}
                    {withVal && <Input
                      value={rule.expectedValue}
                      onChange={(e) => updateRuleValue(index, e.target.value)}
                      placeholder="Final Value"
                      className="text-purple-100"
                    />}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(index)}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic py-2">No rules added yet</div>
          )}
        </div>
      </div>

      {/* Add new rule button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRule}
        className="flex items-center gap-1 border-dashed border-purple-200 text-purple-400 hover:bg-purple-100 hover:text-purple-800"
      >
        <PlusCircle size={16} />
        <span>Add Sensor</span>
      </Button>
    </div>
  )
}
