/**
 * DOC_TBA
 *
 * @name agi_raySegmentCollectionCapacity
 * @glslConstant 
 *
 * @see agi_raySegmentCollection
 */
const int agi_raySegmentCollectionCapacity = 4;

/**
 * DOC_TBA
 *
 * @name agi_raySegmentCollection
 * @glslStruct
 *
 * @see agi_raySegmentCollectionCapacity
 * @see agi_raySegment
 */
struct agi_raySegmentCollection
{
    agi_raySegment intervals[agi_raySegmentCollectionCapacity];
    int count;
};

/**
 * DOC_TBA
 *
 * @name agi_raySegmentCollectionNew
 * @glslFunction
 *
 */
agi_raySegmentCollection agi_raySegmentCollectionNew()
{
    agi_raySegment intervals[agi_raySegmentCollectionCapacity];
    agi_raySegmentCollection i = agi_raySegmentCollection(intervals, 0);
    return i;
}

agi_raySegmentCollection agi_raySegmentCollectionNew(agi_raySegment segment)
{
    agi_raySegment intervals[agi_raySegmentCollectionCapacity];
    intervals[0] = segment;
    agi_raySegmentCollection i = agi_raySegmentCollection(intervals, 1);
    return i;
}

agi_raySegmentCollection agi_raySegmentCollectionNew(agi_raySegment first, agi_raySegment second)
{
    agi_raySegment intervals[agi_raySegmentCollectionCapacity];
    intervals[0] = first;
    intervals[1] = second;
    agi_raySegmentCollection i = agi_raySegmentCollection(intervals, 2);
    return i;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_removeAt
 * @glslFunction
 *
 */
void agi_removeAt(inout agi_raySegmentCollection collection, int index)
{
    --collection.count;
    for (int i = 0; i < agi_raySegmentCollectionCapacity; ++i)
    {
        if (i >= index && i < collection.count)
        {
            collection.intervals[i] = collection.intervals[i + 1];
        }
        else if (i == collection.count)
        {
            break;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_insertAt
 * @glslFunction
 *
 */
void agi_insertAt(inout agi_raySegmentCollection collection, agi_raySegment segment, int index)
{
    for (int i = agi_raySegmentCollectionCapacity - 1; i >= 0; --i)
    {
        if (i <= collection.count && i > index)
        {
            collection.intervals[i] = collection.intervals[i - 1];
        }
        else if (i == index)
        {
            collection.intervals[i] = segment;
        }
        else if (i < index)
        {
            break;
        }
    }
    ++collection.count;
}

void agi_insertAt(inout agi_raySegmentCollection collection, agi_raySegmentCollection segments, int index)
{
    if (segments.count == 1)
    {
        agi_insertAt(collection, segments.intervals[0], index);
    }
    else
    {
        for (int i = agi_raySegmentCollectionCapacity - 1; i >= 0; --i)
        {
            if (i < segments.count)
            {
                agi_insertAt(collection, segments.intervals[i], index);
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_complement
 * @glslFunction
 *
 */
void agi_complement(agi_raySegment segment, out agi_raySegmentCollection collection)
{
    if (agi_isEmpty(segment))
    {
        collection = agi_raySegmentCollectionNew(agi_fullRaySegment);
    }
    else if (segment.stop == agi_infinity)
    {
        if (segment.start == 0.0)
        {
	        collection = agi_raySegmentCollectionNew();
        }
        else
        {
	        collection = agi_raySegmentCollectionNew(agi_raySegment(0.0, segment.start));
        }
    }
    else if (segment.start == 0.0)
    {
        collection = agi_raySegmentCollectionNew(agi_raySegment(segment.stop, agi_infinity));
    }
    else
    {
	    agi_raySegment head = agi_raySegment(0.0, segment.start);
	    agi_raySegment tail = agi_raySegment(segment.stop, agi_infinity);
	    collection = agi_raySegmentCollectionNew(head, tail);
    }        
}

agi_raySegmentCollection agi_complement(agi_raySegmentCollection collection)
{
    if (collection.count == 0)
    {
        agi_raySegmentCollection result = agi_raySegmentCollectionNew(agi_fullRaySegment);
        return result;
    }
    else if (collection.count == 1)
    {
        agi_raySegmentCollection result;
        agi_complement(collection.intervals[0], result);
        return result;
    }

    agi_raySegmentCollection result = agi_raySegmentCollectionNew();

    for (int i = 0; i < agi_raySegmentCollectionCapacity; ++i)
    {
        if (i < collection.count)
        {
            float start = collection.intervals[i].stop;
            if (i < collection.count - 1)
            {
                float stop = collection.intervals[i + 1].start;
                result.intervals[i] = agi_raySegment(start, stop);
                ++result.count;
            }
            else if (start != agi_infinity)
            {
                result.intervals[i] = agi_raySegment(start, agi_infinity);
                ++result.count;
            }
        }
        else
        {
            break;
        }
    }
    
    if (collection.count > 0)
    {
        float stop = collection.intervals[0].start;
        if (stop != 0.0)
        {
            // PERFORMANCE TODO: See if the additional loop iteration from the insert can be eliminated.
            agi_insertAt(result, agi_raySegment(0.0, stop), 0);
        }
    }
    
    return result;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * DOC_TBA
 *
 * @name agi_union
 */
agi_raySegmentCollection agi_union(agi_raySegment left, agi_raySegment right)
{
    if (agi_isFull(left) || agi_isFull(right))
    {
        agi_raySegmentCollection result = agi_raySegmentCollectionNew(agi_fullRaySegment);
        return result;
    }

    float stop = min(left.stop, right.stop);
    float start = max(left.start, right.start);
    
    if (stop < start) // No intersection.
    {
        agi_raySegmentCollection result = (left.start < right.start) ? agi_raySegmentCollectionNew(left, right) : agi_raySegmentCollectionNew(right, left);
        return result;
    }

    agi_raySegmentCollection result = agi_raySegmentCollectionNew(agi_raySegment(min(left.start, right.start), max(left.stop, right.stop)));
    return result;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Determines the intersection of two time intervals.  If they do not intersect, an
 * empty time interval, <code>agi_emptyRaySegment</code>, is returned.
 *
 * @name agi_intersection
 * @glslFunction 
 *
 * @param {agi_raySegment} left One interval.
 * @param {agi_raySegment} right The other interval.
 *
 * @returns {agi_raySegment} The intersection of <code>left</code> and <code>right</code>.
 * 
 * @see agi_unionRaySegments
 * @see agi_subtraction  
 * @see agi_isEmpty
 *
 * @example
 * agi_raySegment i0 = agi_intersection(agi_raySegment(1.0, 2.0), agi_raySegment(3.0, 4.0));    // Empty
 * agi_raySegment i1 = agi_intersection(agi_raySegment(1.0, 3.0), agi_raySegment(2.0, 4.0));    // (2.0, 3.0)
 */
agi_raySegment agi_intersection(agi_raySegment left, agi_raySegment right)
{
    float stop = min(left.stop, right.stop);
    
    if (stop < 0.0)
    {
        return agi_emptyRaySegment;
    }

    float start = max(left.start, right.start);
    
    if (stop < start)
    {
        return agi_emptyRaySegment;
    }

    agi_raySegment s = agi_raySegment(start, stop);
    return s;
}

agi_raySegmentCollection agi_intersection(agi_raySegmentCollection left, agi_raySegment right)
{
    if (left.count == 1)
    {
        agi_raySegment intersection = agi_intersection(left.intervals[0], right);
        
        if (agi_isEmpty(intersection))
        {
            agi_raySegmentCollection result = agi_raySegmentCollectionNew();
            
            return result;
        }
        else
        {
            agi_raySegmentCollection result = agi_raySegmentCollectionNew(intersection);
            
            return result;
        }
    }

    agi_raySegmentCollection result = agi_raySegmentCollectionNew();
    
    for (int leftIndex = 0; leftIndex < agi_raySegmentCollectionCapacity; ++leftIndex)
    {
        if (leftIndex < left.count)
        {
            agi_raySegment intersection = agi_intersection(left.intervals[leftIndex], right);
            if (!agi_isEmpty(intersection))
            {
                agi_insertAt(result, intersection, result.count);
            }
        }
        else
        {
            break;
        }
    }

    return result;
}

agi_raySegmentCollection agi_intersection(agi_raySegmentCollection left, agi_raySegmentCollection right)
{
    if (right.count == 1)
    {
        if (left.count == 1)
        {
            agi_raySegment intersection = agi_intersection(left.intervals[0], right.intervals[0]);
            
	        if (agi_isEmpty(intersection))
	        {
	            agi_raySegmentCollection result = agi_raySegmentCollectionNew();
	            
	            return result;
	        }
	        else
	        {
	            agi_raySegmentCollection result = agi_raySegmentCollectionNew(intersection);
	            
	            return result;
	        }
        }
        else
        {
            agi_raySegmentCollection result = agi_intersection(left, right.intervals[0]);
            
            return result;
        }
    }

    agi_raySegmentCollection result = agi_raySegmentCollectionNew();
    
    if (left.count > 0 && right.count > 0)
    {
        for (int leftIndex = 0; leftIndex < agi_raySegmentCollectionCapacity; ++leftIndex)
        {
            if (leftIndex < left.count)
            {
                for (int rightIndex = 0; rightIndex < agi_raySegmentCollectionCapacity; ++rightIndex)
                {
                    // TODO:  Figure out why this isn't "rightIndex < right.count".
                    if (rightIndex <= right.count && left.intervals[leftIndex].stop >= right.intervals[rightIndex].start)
                    {
	                    agi_raySegment intersection = agi_intersection(left.intervals[leftIndex], right.intervals[rightIndex]);
	                    if (!agi_isEmpty(intersection))
	                    {
                            agi_insertAt(result, intersection, result.count);
                        }
                    }
                    else
                    {
                        break;
	                }
                }
            }
            else
            {
                break;
            }
        }
    }

    return result;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Subtracts one time interval from another, resulting in zero, one, or two non-empty time intervals.
 * 
 * @name agi_subtraction
 * @glslFunction
 *
 * @param {agi_raySegment} outer The outer interval.
 * @param {agi_raySegment} inner The inner interval that is subtracted from <code>outer</code>.
 * 
 * @returns {agi_raySegmentCollection} The time intervals resulting from <code>outer - inner</code>.
 *
 * @see agi_intersection
 * @see agi_unionRaySegments
 *
 * @example
 * agi_raySegmentCollection i0 = agi_subtraction(
 *   agi_raySegment(1.0, 4.0), agi_raySegment(2.0, 3.0)); 
 * // i0 is [(1.0, 2.0), (3.0, 4.0)]
 * 
 * agi_raySegmentCollection i1 = agi_subtraction(
 *   agi_raySegment(1.0, 4.0), agi_raySegment(1.0, 2.0));
 * // i1 is [(2.0, 4.0)]
 * 
 * agi_raySegmentCollection i2 = agi_subtraction(
 *   agi_raySegment(1.0, 4.0), agi_raySegment(5.0, 6.0));
 * // i2 is []
 */
agi_raySegmentCollection agi_subtraction(agi_raySegment outer, agi_raySegment inner)
{
    // This function has ANGLE workarounds:  http://code.google.com/p/angleproject/issues/detail?id=185

    agi_raySegmentCollection i = agi_raySegmentCollectionNew();

    agi_raySegment intersection = agi_intersection(outer, inner);
    
    if (agi_isEmpty(intersection) || (intersection.start == intersection.stop))
    {
        // No intersection, or intersection at an end point; subtraction doesn't change outer.
        i.count = 1;
        i.intervals[0] = outer;
    }
    else
    {
        if ((intersection.start == outer.start) && (intersection.stop == outer.stop))
        {
            // outer and inner are the same interval; subtracting them yields empty intervals.
            i.count = 0;
        }
        else if (intersection.start == outer.start)
        {
            // inner is completely inside outer, and touching the left boundary; subtraction yields one interval
            i.count = 1;
            i.intervals[0] = agi_raySegment(inner.stop, outer.stop);
        }
        else if (intersection.stop == outer.stop)
        {
            // inner is completely inside outer, and touching the right boundary; subtraction yields one interval
            i.count = 1;
            i.intervals[0] = agi_raySegment(outer.start, inner.start);
        }
        else
        {
            // inner is completely inside outer, but not on a boundary; break outer into two intervals
            i.count = 2;
            i.intervals[0] = agi_raySegment(outer.start, inner.start);
            i.intervals[1] = agi_raySegment(inner.stop, outer.stop);
        }
    }
    
    return i;
}

/**
 * DOC_TBA
 *
 * @name agi_subtraction
 */
agi_raySegmentCollection agi_subtraction(agi_raySegmentCollection left, agi_raySegment right)
{
    if (left.count == 1)
    {
        agi_raySegmentCollection result = agi_subtraction(left.intervals[0], right);
        
        return result;
    }

    agi_raySegmentCollection result = agi_raySegmentCollectionNew();
    
    for (int leftIndex = 0; leftIndex < agi_raySegmentCollectionCapacity; ++leftIndex)
    {
        if (leftIndex < left.count)
        {
            agi_raySegmentCollection segments = agi_subtraction(left.intervals[leftIndex], right);
            if (segments.count != 0)
            {
                agi_insertAt(result, segments, result.count);
            }
        }
        else
        {
            break;
        }
    }

    return result;
}

/**
 * DOC_TBA
 *
 * @name agi_subtraction
 */
agi_raySegmentCollection agi_subtraction(agi_raySegmentCollection left, agi_raySegmentCollection right)
{
    if (right.count == 1)
    {
        if (left.count == 1)
        {
            agi_raySegmentCollection result = agi_subtraction(left.intervals[0], right.intervals[0]);
            
            return result;
        }
        else
        {
	        agi_raySegmentCollection result = agi_subtraction(left, right.intervals[0]);
	        
	        return result;
        }
    }

    // PERFORMANCE TODO: See if these two calls (with separate loop iterations) can be combined into one loop.
    agi_raySegmentCollection complement = agi_complement(right);

    agi_raySegmentCollection result = agi_intersection(left, complement);
    
    return result;
}
