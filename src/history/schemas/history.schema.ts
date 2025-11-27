import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class History extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: Object, required: true })
  origin: { lat: number; lon: number };

  @Prop({ type: Object, required: true })
  destination: { lat: number; lon: number };

  @Prop()
  polyline: string;

  @Prop()
  distanceMeters: number;

  @Prop()
  durationSeconds: number;

  @Prop()
  summary: string;

  @Prop()
  sampleCount: number;

  @Prop()
  includeRisk: boolean;

  @Prop({ type: Object })
  riskSummary: any;

  @Prop({ type: Object })
  weatherSummary: any;

  @Prop({ type: Array })
  riskPoints: any[];

  @Prop()
  startedAt: Date;

  @Prop()
  endedAt: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);

HistorySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

HistorySchema.set('toObject', {
  virtuals: true,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
